"use server";

import { z } from "zod";
import { resolveEffectiveSlots, startOfDay } from "@/lib/scheduler/smart-scheduler";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { checkGeofence } from "@/lib/geofence";
import { getAttendanceQueue } from "@/lib/queue/queues";
import { checkRateLimit, isDuplicate } from "@/lib/rate-limit";
import { enqueueNotification } from "@/lib/notifications";
import { createAuditLog } from "@/lib/audit";
import { notifyLinkedGuardians } from "@/lib/notifications";
import {
  ATTENDANCE_MAX_ATTEMPTS,
  getNextAttemptNumber,
} from "@/lib/attendance/face-attendance";

const submitAttendanceSchema = z.object({
  geoLat: z.number(),
  geoLng: z.number(),
  imageBase64: z.string().optional(),
});

export async function submitTeacherAttendanceAction(input: z.infer<typeof submitAttendanceSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_MARK);
  const schoolId = ctx.schoolId;
  const data = submitAttendanceSchema.parse(input);

  const rateLimit = await checkRateLimit(`attendance:${ctx.userId}`, 10, 300);
  if (!rateLimit.allowed) {
    throw new Error("Too many attendance attempts. Please wait.");
  }

  const dedupeKey = `attendance:dedupe:${ctx.userId}:${Math.floor(Date.now() / 5000)}`;
  if (await isDuplicate(dedupeKey, 5)) {
    throw new Error("Duplicate submission detected");
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found");

  // Compare device GPS (geoLat/geoLng) against campus coords set via Google Maps at registration.
  const geofence = checkGeofence(
    data.geoLat,
    data.geoLng,
    school.campusLat,
    school.campusLng,
    school.campusRadiusM,
  );

  if (!geofence.allowed) {
    return { success: false, blocked: true, message: geofence.message };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let attendance = await prisma.teacherAttendance.findUnique({
    where: {
      schoolId_teacherId_date: {
        schoolId: ctx.schoolId,
        teacherId: ctx.userId,
        date: today,
      },
    },
    include: { attempts: { orderBy: { attemptNumber: "desc" } } },
  });

  if (attendance?.status === "PRESENT") {
    return { success: true, status: "PRESENT", message: "Already marked present" };
  }

  const recentAttempts = attendance?.attempts ?? [];
  const lastAttempt = recentAttempts[0];
  const attemptNumber = getNextAttemptNumber(lastAttempt);

  if (!attendance) {
    attendance = await prisma.teacherAttendance.create({
      data: {
        schoolId: ctx.schoolId,
        teacherId: ctx.userId,
        date: today,
        status: "PROCESSING",
        geoLat: data.geoLat,
        geoLng: data.geoLng,
      },
      include: { attempts: true },
    });
  } else {
    await prisma.teacherAttendance.update({
      where: { id: attendance.id },
      data: { status: "PROCESSING", geoLat: data.geoLat, geoLng: data.geoLng },
    });
  }

  const attempt = await prisma.attendanceAttempt.create({
    data: {
      teacherAttendanceId: attendance.id,
      attemptNumber,
      geoLat: data.geoLat,
      geoLng: data.geoLng,
    },
  });

  if (attemptNumber >= ATTENDANCE_MAX_ATTEMPTS && data.imageBase64) {
    const evidenceKey = `attendance/evidence/${ctx.userId}/${Date.now()}.jpg`;
    await prisma.attendanceAttempt.update({
      where: { id: attempt.id },
      data: { evidenceImageKey: evidenceKey },
    });

    await prisma.teacherAttendance.update({
      where: { id: attendance.id },
      data: { status: "ESCALATED" },
    });

    const admins = await prisma.userSchoolMembership.findMany({
      where: { schoolId: ctx.schoolId, role: "SCHOOL_ADMIN", isActive: true },
    });

    for (const admin of admins) {
      await enqueueNotification({
        schoolId: ctx.schoolId,
        userId: admin.userId,
        title: "Attendance Escalation",
        body: `Teacher ${ctx.name} failed face verification 3 times. Manual review required.`,
        metadata: { teacherId: ctx.userId, attendanceId: attendance.id },
      });
    }

    return { success: false, status: "ESCALATED", attemptNumber };
  }

  const queue = getAttendanceQueue();
  await queue.add(
    "verify",
    {
      type: "teacher",
      attendanceId: attendance.id,
      attemptId: attempt.id,
      userId: ctx.userId,
      schoolId: ctx.schoolId,
      attemptNumber,
      imageBase64: data.imageBase64,
    },
    { jobId: `attendance-${attempt.id}` },
  );

  return { success: true, status: "PROCESSING", attemptNumber, attendanceId: attendance.id };
}

export async function getTeacherAttendanceStatusAction(attendanceId: string) {
  const ctx = await requireSchoolContext();
  const attendance = await prisma.teacherAttendance.findFirst({
    where: { id: attendanceId, schoolId: ctx.schoolId, teacherId: ctx.userId },
    include: { attempts: { orderBy: { attemptNumber: "desc" } } },
  });
  return attendance;
}

export async function getTeacherScheduleAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const version = await tx.scheduleVersion.findFirst({
      where: { schoolId: ctx.schoolId, isActive: true },
    });
    if (!version) return [];

    return tx.scheduleSlot.findMany({
      where: { versionId: version.id, teacherId: ctx.userId },
      include: { classSection: true, subject: true },
      orderBy: [{ dayOfWeek: "asc" }, { periodNo: "asc" }],
    });
  });
}

export async function getTeacherTodayScheduleAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const date = startOfDay(new Date());
    const effective = await resolveEffectiveSlots(ctx.schoolId, date, tx);
    return effective
      .filter((s) => s.teacherId === ctx.userId || s.originalTeacherId === ctx.userId)
      .map((s) => ({
        id: s.id ?? s.alterationId ?? `${s.periodNo}-${s.classSectionId}`,
        dayOfWeek: s.dayOfWeek,
        periodNo: s.periodNo,
        teacherId: s.teacherId,
        classSectionId: s.classSectionId,
        subjectId: s.subjectId,
        classSection: s.classSection!,
        subject: s.subject!,
        isAltered: s.isAltered,
        originalTeacherId: s.originalTeacherId,
        alterationType: s.alterationType,
        isCovering: s.isAltered && s.teacherId === ctx.userId,
        isCovered: s.isAltered && s.originalTeacherId === ctx.userId,
      }))
      .sort((a, b) => a.periodNo - b.periodNo);
  });
}

export async function getTeacherUpcomingAlterationsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.scheduleAlteration.findMany({
      where: {
        schoolId: ctx.schoolId,
        status: "ACTIVE",
        date: { gte: startOfDay(new Date()) },
        OR: [
          { originalTeacherId: ctx.userId },
          { substituteTeacherId: ctx.userId },
        ],
      },
      include: { classSection: true, subject: true },
      orderBy: [{ date: "asc" }, { periodNo: "asc" }],
    });
  });
}

export async function markStudentAbsentAction(studentId: string, date?: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_MARK);
  const attendanceDate = date ? new Date(date) : new Date();
  attendanceDate.setHours(0, 0, 0, 0);

  const record = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.studentAttendance.upsert({
      where: {
        schoolId_studentId_date: {
          schoolId: ctx.schoolId,
          studentId,
          date: attendanceDate,
        },
      },
      create: {
        schoolId: ctx.schoolId,
        studentId,
        date: attendanceDate,
        status: "ABSENT",
        markedBy: ctx.userId,
      },
      update: { status: "ABSENT", markedBy: ctx.userId },
    });
  });

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  await notifyLinkedGuardians(
    ctx.schoolId,
    studentId,
    "Absence Notification",
    `${student?.name ?? "Your child"} was marked absent today.`,
  );

  return record;
}

const leaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(3),
  leaveType: z.enum(["REGULAR", "OD"]).default("REGULAR"),
});

export async function submitTeacherLeaveAction(input: z.infer<typeof leaveSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.LEAVE_REQUEST);
  const data = leaveSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.create({
      data: {
        schoolId: ctx.schoolId,
        requesterId: ctx.userId,
        requesterType: "TEACHER",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        leaveType: data.leaveType,
      },
    });
  });
}

export async function listTeacherLeaveRequestsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.findMany({
      where: { requesterId: ctx.userId, requesterType: "TEACHER" },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function submitStaffLeaveAction(input: z.infer<typeof leaveSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.LEAVE_REQUEST);
  const data = leaveSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.create({
      data: {
        schoolId: ctx.schoolId,
        requesterId: ctx.userId,
        requesterType: "STAFF",
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        leaveType: data.leaveType,
      },
    });
  });
}

export async function listStaffLeaveRequestsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.findMany({
      where: { requesterId: ctx.userId, requesterType: "STAFF" },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function listEscalatedAttendanceAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.teacherAttendance.findMany({
      where: { schoolId: ctx.schoolId, status: "ESCALATED" },
      include: {
        teacher: true,
        attempts: { orderBy: { attemptNumber: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  });
}

export async function overrideAttendanceAction(
  attendanceId: string,
  status: "PRESENT" | "FAILED" | "ABSENT",
  note?: string,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_OVERRIDE);

  const updated = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.teacherAttendance.update({
      where: { id: attendanceId, schoolId: ctx.schoolId },
      data: {
        status,
        markedAt: status === "PRESENT" ? new Date() : undefined,
        method: "manual_override",
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "attendance.override",
    schoolId: ctx.schoolId,
    entityType: "TeacherAttendance",
    entityId: attendanceId,
    metadata: { status, note },
  });

  return updated;
}

export async function listTeacherAttendanceRecordsAction(startDate?: string, endDate?: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.teacherAttendance.findMany({
      where: {
        schoolId: ctx.schoolId,
        ...(startDate && endDate
          ? { date: { gte: new Date(startDate), lte: new Date(endDate) } }
          : {}),
      },
      include: { teacher: true, attempts: true },
      orderBy: { date: "desc" },
    });
  });
}

export async function enrollFaceAction(_imageBase64: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_MARK);
  const key = `face/${ctx.userId}/enrolled.jpg`;

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { faceImageKey: key },
  });

  return { enrolled: true, key };
}
