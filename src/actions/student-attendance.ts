"use server";

import { z } from "zod";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { ForbiddenError } from "@/lib/errors";
import { parseIsoDate } from "@/lib/calendar/working-days";
import { isoDateString } from "@/lib/schemas/date";
import { notifyLinkedGuardians, enqueueNotification } from "@/lib/notifications";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";

/** Fetch class sections assigned to the logged-in teacher */
export async function getTeacherAssignedClassSectionsAction() {
  const ctx = await requireSchoolContext();
  if (ctx.role !== "TEACHER" && ctx.role !== "SCHOOL_ADMIN" && ctx.role !== "SYSTEM_ADMIN") {
    throw new ForbiddenError("Only teachers or school admins can view assigned classes.");
  }

  return withTenantContext(ctx.schoolId, async (tx) => {
    let classSectionIds: string[] = [];

    if (ctx.role === "TEACHER") {
      const assignments = await tx.teacherAssignment.findMany({
        where: { schoolId: ctx.schoolId, teacherId: ctx.userId },
        select: { classSectionId: true },
      });
      classSectionIds = [...new Set(assignments.map((a) => a.classSectionId))];
    } else {
      const allSections = await tx.classSection.findMany({
        where: { schoolId: ctx.schoolId },
        select: { id: true },
      });
      classSectionIds = allSections.map((s) => s.id);
    }

    if (classSectionIds.length === 0) return [];

    const sections = await tx.classSection.findMany({
      where: { schoolId: ctx.schoolId, id: { in: classSectionIds } },
      include: {
        gradeRef: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ gradeRef: { sortOrder: "asc" } }, { section: "asc" }],
    });

    return sections.map((s) => ({
      id: s.id,
      name: `${s.gradeRef?.name ?? s.grade} - ${s.section}`,
      gradeName: s.gradeRef?.name ?? s.grade,
      sectionName: s.section,
      studentCount: s._count.students,
    }));
  });
}

/** Get student roster with current attendance & parent leave requests for a given date */
export async function getClassRosterAttendanceAction(input: {
  classSectionId: string;
  date: string;
}) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_VIEW);
  const targetDate = parseIsoDate(input.date);

  return withTenantContext(ctx.schoolId, async (tx) => {
    // Fetch students in this class section
    const students = await tx.student.findMany({
      where: { schoolId: ctx.schoolId, classSectionId: input.classSectionId },
      orderBy: { name: "asc" },
    });

    if (students.length === 0) {
      return { students: [], date: input.date };
    }

    const studentIds = students.map((s) => s.id);

    // Fetch attendance records for these students on targetDate
    const attendances = await tx.studentAttendance.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId: { in: studentIds },
        date: targetDate,
      },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

    // Fetch active/pending parent leave requests covering targetDate
    const leaveRequests = await tx.leaveRequest.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId: { in: studentIds },
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
        status: { in: ["PENDING", "APPROVED"] },
      },
      include: { requester: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });

    const leaveMap = new Map<string, typeof leaveRequests[0]>();
    for (const req of leaveRequests) {
      if (req.studentId && !leaveMap.has(req.studentId)) {
        leaveMap.set(req.studentId, req);
      }
    }

    // Build signed download URLs for medical certs if attached
    const roster = await Promise.all(
      students.map(async (student) => {
        const att = attendanceMap.get(student.id);
        const leave = leaveMap.get(student.id);

        let medicalCertUrl: string | undefined;
        if (leave?.medicalCertS3Key) {
          try {
            medicalCertUrl = await getPresignedDownloadUrl(leave.medicalCertS3Key);
          } catch {
            medicalCertUrl = undefined;
          }
        }

        return {
          id: student.id,
          name: student.name,
          admissionNo: student.admissionNo,
          attendance: att
            ? {
                id: att.id,
                status: att.status,
                session: att.session ?? undefined,
                notes: att.notes ?? undefined,
                leaveRequestId: att.leaveRequestId ?? undefined,
              }
            : null,
          leaveRequest: leave
            ? {
                id: leave.id,
                reason: leave.reason,
                leaveType: leave.leaveType,
                isHalfDay: leave.isHalfDay,
                halfDaySession: leave.halfDaySession ?? undefined,
                status: leave.status,
                medicalCertS3Key: leave.medicalCertS3Key ?? undefined,
                medicalCertName: leave.medicalCertName ?? undefined,
                medicalCertUrl,
                parentName: leave.requester?.name,
              }
            : null,
        };
      }),
    );

    return {
      students: roster,
      date: input.date,
    };
  });
}

const batchAttendanceRecordSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY"]),
  session: z.enum(["FULL_DAY", "FIRST_HALF", "SECOND_HALF"]).optional(),
  notes: z.string().optional(),
  leaveRequestId: z.string().uuid().optional(),
});

const saveBatchAttendanceSchema = z.object({
  classSectionId: z.string().uuid(),
  date: isoDateString,
  records: z.array(batchAttendanceRecordSchema),
});

/** Save or update batch attendance for a class section */
export async function saveBatchStudentAttendanceAction(input: z.infer<typeof saveBatchAttendanceSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.ATTENDANCE_MARK);
  const data = saveBatchAttendanceSchema.parse(input);
  const targetDate = parseIsoDate(data.date);

  const results = await withTenantContext(ctx.schoolId, async (tx) => {
    const upserted = [];

    for (const record of data.records) {
      const item = await tx.studentAttendance.upsert({
        where: {
          schoolId_studentId_date: {
            schoolId: ctx.schoolId,
            studentId: record.studentId,
            date: targetDate,
          },
        },
        create: {
          schoolId: ctx.schoolId,
          studentId: record.studentId,
          date: targetDate,
          status: record.status,
          session: record.session ?? (record.status === "HALF_DAY" ? "FIRST_HALF" : "FULL_DAY"),
          notes: record.notes,
          leaveRequestId: record.leaveRequestId,
          markedBy: ctx.userId,
        },
        update: {
          status: record.status,
          session: record.session ?? (record.status === "HALF_DAY" ? "FIRST_HALF" : "FULL_DAY"),
          notes: record.notes,
          leaveRequestId: record.leaveRequestId,
          markedBy: ctx.userId,
        },
      });

      upserted.push(item);

      // Notify guardians if student is marked ABSENT or HALF_DAY
      if (record.status === "ABSENT" || record.status === "HALF_DAY") {
        const student = await tx.student.findUnique({ where: { id: record.studentId }, select: { name: true } });
        const label = record.status === "HALF_DAY" ? "Half-Day Leave" : "Absent";
        await notifyLinkedGuardians(
          ctx.schoolId,
          record.studentId,
          `Attendance Alert: ${label}`,
          `${student?.name ?? "Your child"} was marked ${label.toLowerCase()} on ${data.date}.`,
        );
      }
    }

    return upserted;
  });

  return { success: true, count: results.length };
}

/** Get list of parent leave requests for students in assigned classes of teacher */
export async function getTeacherStudentLeaveRequestsAction(classSectionId?: string) {
  const ctx = await requireSchoolContext();
  if (ctx.role !== "TEACHER" && ctx.role !== "SCHOOL_ADMIN" && ctx.role !== "SYSTEM_ADMIN") {
    throw new ForbiddenError("Only teachers or school admins can review student leave requests.");
  }

  return withTenantContext(ctx.schoolId, async (tx) => {
    let filterClassIds: string[] = [];

    if (classSectionId) {
      filterClassIds = [classSectionId];
    } else if (ctx.role === "TEACHER") {
      const assignments = await tx.teacherAssignment.findMany({
        where: { schoolId: ctx.schoolId, teacherId: ctx.userId },
        select: { classSectionId: true },
      });
      filterClassIds = [...new Set(assignments.map((a) => a.classSectionId))];
    }

    const whereStudent: any = { schoolId: ctx.schoolId };
    if (filterClassIds.length > 0) {
      whereStudent.classSectionId = { in: filterClassIds };
    }

    const students = await tx.student.findMany({
      where: whereStudent,
      select: { id: true },
    });

    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return [];

    const requests = await tx.leaveRequest.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId: { in: studentIds },
        requesterType: "PARENT",
      },
      include: {
        student: {
          include: { classSection: true },
        },
        requester: { select: { name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      requests.map(async (req) => {
        let medicalCertUrl: string | undefined;
        if (req.medicalCertS3Key) {
          try {
            medicalCertUrl = await getPresignedDownloadUrl(req.medicalCertS3Key);
          } catch {
            medicalCertUrl = undefined;
          }
        }
        return {
          ...req,
          medicalCertUrl,
        };
      }),
    );
  });
}

const teacherReviewLeaveSchema = z.object({
  leaveRequestId: z.string().uuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

/** Teacher action to review (Approve/Reject) a parent leave request */
export async function teacherReviewStudentLeaveAction(input: z.infer<typeof teacherReviewLeaveSchema>) {
  const ctx = await requireSchoolContext();
  if (ctx.role !== "TEACHER" && ctx.role !== "SCHOOL_ADMIN" && ctx.role !== "SYSTEM_ADMIN") {
    throw new ForbiddenError("Only teachers or admins can review leave requests.");
  }

  const data = teacherReviewLeaveSchema.parse(input);

  const updated = await withTenantContext(ctx.schoolId, async (tx) => {
    const leaveReq = await tx.leaveRequest.findUnique({
      where: { id: data.leaveRequestId, schoolId: ctx.schoolId },
      include: { student: true },
    });

    if (!leaveReq) throw new Error("Leave request not found");

    const result = await tx.leaveRequest.update({
      where: { id: data.leaveRequestId },
      data: {
        status: data.status,
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote,
      },
    });

    // If approved, automatically update/upsert student attendance for dates in range
    if (data.status === "APPROVED" && leaveReq.studentId) {
      const cur = new Date(leaveReq.startDate);
      const end = new Date(leaveReq.endDate);

      while (cur <= end) {
        const attStatus = leaveReq.isHalfDay ? "HALF_DAY" : "ABSENT";
        const sessionVal = leaveReq.isHalfDay
          ? leaveReq.halfDaySession ?? "FIRST_HALF"
          : "FULL_DAY";

        await tx.studentAttendance.upsert({
          where: {
            schoolId_studentId_date: {
              schoolId: ctx.schoolId,
              studentId: leaveReq.studentId,
              date: new Date(cur),
            },
          },
          create: {
            schoolId: ctx.schoolId,
            studentId: leaveReq.studentId,
            date: new Date(cur),
            status: attStatus,
            session: sessionVal,
            notes: `Approved Leave Request: ${leaveReq.reason}`,
            leaveRequestId: leaveReq.id,
            markedBy: ctx.userId,
          },
          update: {
            status: attStatus,
            session: sessionVal,
            notes: `Approved Leave Request: ${leaveReq.reason}`,
            leaveRequestId: leaveReq.id,
            markedBy: ctx.userId,
          },
        });

        cur.setDate(cur.getDate() + 1);
      }
    }

    return result;
  });

  // Notify parent
  await enqueueNotification({
    schoolId: ctx.schoolId,
    userId: updated.requesterId,
    title: "Student Leave Request Updated",
    body: `Your leave request for student was ${data.status.toLowerCase()}.`,
    metadata: { leaveRequestId: updated.id, status: data.status },
  });

  return updated;
}
