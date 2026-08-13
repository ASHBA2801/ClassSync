"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { hasCapability, CAPABILITIES } from "@/lib/employees/capabilities";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import type { EmployeeJobType } from "@prisma/client";
import { checkGeofence } from "@/lib/geofence";
import { dispatchFaceVerification } from "@/lib/jobs/dispatch";
import { checkRateLimit, isDuplicate } from "@/lib/rate-limit";
import { enqueueNotification } from "@/lib/notifications";
import {
  ATTENDANCE_MAX_ATTEMPTS,
  getNextAttemptNumber,
} from "@/lib/attendance/face-attendance";
import {
  buildS3Key,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  putObject,
} from "@/lib/storage/s3";

async function getStaffEmployee() {
  const ctx = await requireSchoolContext();
  const employee = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.employee.findUnique({
      where: { schoolId_userId: { schoolId: ctx.schoolId, userId: ctx.userId } },
    }),
  );
  if (!employee) throw new Error("Employee profile not found");
  return { ctx, employee };
}

function assertCapability(jobType: EmployeeJobType, capability: (typeof CAPABILITIES)[keyof typeof CAPABILITIES]) {
  if (!hasCapability(jobType, capability)) {
    throw new Error("Not authorized for this action");
  }
}

// Transport
export async function listTransportRoutesAction() {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.TRANSPORT_ROUTES_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const routes = await tx.transportRoute.findMany({
      where: { schoolId: ctx.schoolId, isActive: true },
      include: {
        assignments: {
          where: { employeeId: employee.id },
          include: { employee: { include: { user: { select: { name: true } } } } },
        },
      },
    });

    const canManage = hasCapability(employee.jobType, CAPABILITIES.TRANSPORT_ROUTES_MANAGE);
    if (canManage) {
      return tx.transportRoute.findMany({
        where: { schoolId: ctx.schoolId },
        include: {
          assignments: {
            include: { employee: { include: { user: { select: { name: true } } } } },
          },
        },
        orderBy: { name: "asc" },
      });
    }

    return routes.filter((r) => r.assignments.length > 0);
  });
}

const transportRouteSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  vehicleNo: z.string().optional(),
});

export async function createTransportRouteAction(input: z.infer<typeof transportRouteSchema>) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.TRANSPORT_ROUTES_MANAGE);
  const data = transportRouteSchema.parse(input);

  const route = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.transportRoute.create({
      data: { schoolId: ctx.schoolId, ...data },
    }),
  );

  revalidatePath("/staff/transport");
  return { routeId: route.id };
}

export async function assignDriverToRouteAction(routeId: string, targetEmployeeId: string) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.TRANSPORT_ROUTES_MANAGE);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const target = await tx.employee.findFirst({
      where: { id: targetEmployeeId, schoolId: ctx.schoolId },
    });
    if (!target) throw new Error("Employee not found");

    await tx.transportRouteAssignment.upsert({
      where: { routeId_employeeId: { routeId, employeeId: targetEmployeeId } },
      create: { routeId, employeeId: targetEmployeeId, userId: target.userId },
      update: {},
    });
  });

  revalidatePath("/staff/transport");
  return { success: true };
}

// Security visitor log
const visitorSchema = z.object({
  visitorName: z.string().min(1),
  purpose: z.string().min(1),
  phone: z.string().min(7, "Mobile number is required"),
  notes: z.string().optional(),
  photoS3Key: z.string().min(1, "Visitor photo is required"),
});

const visitorPhotoUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
});

export type VisitorLogView = {
  id: string;
  visitorName: string;
  purpose: string;
  phone: string | null;
  photoUrl: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  notes: string | null;
  loggedBy: { name: string };
};

async function mapVisitorLogsWithPhotos(
  logs: Array<{
    id: string;
    visitorName: string;
    purpose: string;
    phone: string | null;
    photoS3Key: string | null;
    checkInAt: Date;
    checkOutAt: Date | null;
    notes: string | null;
    loggedBy: { name: string };
  }>,
): Promise<VisitorLogView[]> {
  return Promise.all(
    logs.map(async (log) => ({
      id: log.id,
      visitorName: log.visitorName,
      purpose: log.purpose,
      phone: log.phone,
      photoUrl: log.photoS3Key ? await getPresignedDownloadUrl(log.photoS3Key) : null,
      checkInAt: log.checkInAt.toISOString(),
      checkOutAt: log.checkOutAt?.toISOString() ?? null,
      notes: log.notes,
      loggedBy: log.loggedBy,
    })),
  );
}

export async function getVisitorPhotoUploadUrlAction(
  input: z.infer<typeof visitorPhotoUploadSchema>,
) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SECURITY_VISITOR_LOG);
  const data = visitorPhotoUploadSchema.parse(input);

  const mimeType = data.mimeType.startsWith("image/")
    ? data.mimeType
    : "image/jpeg";
  const key = buildS3Key(`visitors/${ctx.schoolId}`, data.filename);
  const uploadUrl = await getPresignedUploadUrl(key, mimeType);
  return { uploadUrl, key };
}

/** Upload a camera-captured image (base64) and return the S3 key. */
export async function uploadVisitorPhotoBase64Action(imageBase64: string) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SECURITY_VISITOR_LOG);

  const raw = imageBase64.includes(",")
    ? imageBase64.split(",")[1]!
    : imageBase64;
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length < 100) throw new Error("Invalid photo");
  if (buffer.length > 5 * 1024 * 1024) throw new Error("Photo too large (max 5MB)");

  const key = buildS3Key(`visitors/${ctx.schoolId}`, "visitor.jpg");
  await putObject(key, buffer, "image/jpeg");
  return { key };
}

export async function logVisitorAction(input: z.infer<typeof visitorSchema>) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SECURITY_VISITOR_LOG);
  const data = visitorSchema.parse(input);

  if (!data.photoS3Key.startsWith(`visitors/${ctx.schoolId}/`)) {
    throw new Error("Invalid photo key");
  }

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.securityVisitorLog.create({
      data: {
        schoolId: ctx.schoolId,
        loggedById: ctx.userId,
        visitorName: data.visitorName,
        purpose: data.purpose,
        phone: data.phone,
        photoS3Key: data.photoS3Key,
        notes: data.notes,
      },
    });
  });

  revalidatePath("/staff/security");
  revalidatePath("/staff/security/logs");
  revalidatePath("/admin/visitor-logs");
  return { success: true };
}

export async function checkoutVisitorAction(visitorLogId: string) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SECURITY_VISITOR_LOG);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.securityVisitorLog.update({
      where: { id: visitorLogId },
      data: { checkOutAt: new Date() },
    });
  });

  revalidatePath("/staff/security");
  revalidatePath("/staff/security/logs");
  revalidatePath("/admin/visitor-logs");
  return { success: true };
}

export async function listVisitorLogsAction(): Promise<VisitorLogView[]> {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SECURITY_VISITOR_LOG);

  const logs = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.securityVisitorLog.findMany({
      where: { schoolId: ctx.schoolId },
      include: { loggedBy: { select: { name: true } } },
      orderBy: { checkInAt: "desc" },
      take: 100,
    }),
  );

  return mapVisitorLogsWithPhotos(logs);
}

export async function listAdminVisitorLogsAction(): Promise<VisitorLogView[]> {
  const ctx = await requireSchoolPermission(PERMISSIONS.AUDIT_VIEW);

  const logs = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.securityVisitorLog.findMany({
      where: { schoolId: ctx.schoolId },
      include: { loggedBy: { select: { name: true } } },
      orderBy: { checkInAt: "desc" },
      take: 200,
    }),
  );

  return mapVisitorLogsWithPhotos(logs);
}

// Cleaner tasks
export async function listCleanerTasksAction() {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.CLEANER_ZONE_TASKS);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.cleanerZoneAssignment.findMany({
      where: { schoolId: ctx.schoolId, employeeId: employee.id, date: today },
      orderBy: { zoneName: "asc" },
    }),
  );
}

const cleanerTaskSchema = z.object({
  zoneName: z.string().min(1),
  tasks: z.array(z.string()).default([]),
  date: z.string(),
});

export async function assignCleanerZoneAction(input: z.infer<typeof cleanerTaskSchema> & { employeeId?: string }) {
  const ctx = await requireSchoolContext();
  const data = cleanerTaskSchema.parse(input);
  const employeeId = input.employeeId;

  return withTenantContext(ctx.schoolId, async (tx) => {
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId) {
      const emp = await tx.employee.findUnique({
        where: { schoolId_userId: { schoolId: ctx.schoolId, userId: ctx.userId } },
      });
      if (!emp) throw new Error("Employee not found");
      targetEmployeeId = emp.id;
    }

    return tx.cleanerZoneAssignment.upsert({
      where: {
        employeeId_zoneName_date: {
          employeeId: targetEmployeeId,
          zoneName: data.zoneName,
          date: new Date(data.date),
        },
      },
      create: {
        schoolId: ctx.schoolId,
        employeeId: targetEmployeeId,
        zoneName: data.zoneName,
        tasks: data.tasks,
        date: new Date(data.date),
      },
      update: { tasks: data.tasks },
    });
  });
}

export async function completeCleanerTaskAction(assignmentId: string) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.CLEANER_ZONE_TASKS);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.cleanerZoneAssignment.update({
      where: { id: assignmentId, employeeId: employee.id },
      data: { isComplete: true },
    });
  });

  revalidatePath("/staff/cleaning");
  return { success: true };
}

// Sports / PET
const sportsEventSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string(),
  location: z.string().optional(),
  equipment: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export async function listSportsSchedulesAction() {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SPORTS_SCHEDULE);

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.sportsSchedule.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: { eventDate: "asc" },
      take: 30,
    }),
  );
}

export async function createSportsScheduleAction(input: z.infer<typeof sportsEventSchema>) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.SPORTS_SCHEDULE);
  const data = sportsEventSchema.parse(input);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.sportsSchedule.create({
      data: {
        schoolId: ctx.schoolId,
        title: data.title,
        eventDate: new Date(data.eventDate),
        location: data.location,
        equipment: data.equipment,
        notes: data.notes,
      },
    });
  });

  revalidatePath("/staff/sports");
  return { success: true };
}

// Library
const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
  totalCopies: z.number().int().positive().default(1),
});

export async function listLibraryBooksAction() {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.LIBRARY_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.libraryBook.findMany({
      where: { schoolId: ctx.schoolId },
      include: { issues: { where: { returnedAt: null } } },
      orderBy: { title: "asc" },
    }),
  );
}

export async function addLibraryBookAction(input: z.infer<typeof bookSchema>) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.LIBRARY_MANAGE);
  const data = bookSchema.parse(input);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.libraryBook.create({
      data: {
        schoolId: ctx.schoolId,
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        totalCopies: data.totalCopies,
        available: data.totalCopies,
      },
    });
  });

  revalidatePath("/staff/library");
  return { success: true };
}

const issueSchema = z.object({
  bookId: z.string().uuid(),
  issuedTo: z.string().min(1),
  dueDate: z.string(),
});

export async function issueLibraryBookAction(input: z.infer<typeof issueSchema>) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.LIBRARY_MANAGE);
  const data = issueSchema.parse(input);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const book = await tx.libraryBook.findFirst({
      where: { id: data.bookId, schoolId: ctx.schoolId },
    });
    if (!book || book.available <= 0) throw new Error("Book not available");

    await tx.libraryIssue.create({
      data: {
        bookId: data.bookId,
        issuedTo: data.issuedTo,
        dueDate: new Date(data.dueDate),
      },
    });

    await tx.libraryBook.update({
      where: { id: data.bookId },
      data: { available: book.available - 1 },
    });
  });

  revalidatePath("/staff/library");
  return { success: true };
}

// Staff attendance (face recognition)
const submitStaffAttendanceSchema = z.object({
  geoLat: z.number(),
  geoLng: z.number(),
  imageBase64: z.string().optional(),
});

export async function submitStaffAttendanceAction(input: z.infer<typeof submitStaffAttendanceSchema>) {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.ATTENDANCE_MARK);
  const data = submitStaffAttendanceSchema.parse(input);

  const rateLimit = await checkRateLimit(`attendance:${ctx.userId}`, 10, 300);
  if (!rateLimit.allowed) {
    throw new Error("Too many attendance attempts. Please wait.");
  }

  const dedupeKey = `attendance:dedupe:${ctx.userId}:${Math.floor(Date.now() / 5000)}`;
  if (await isDuplicate(dedupeKey, 5)) {
    throw new Error("Duplicate submission detected");
  }

  const school = await prisma.school.findUnique({ where: { id: ctx.schoolId } });
  if (!school) throw new Error("School not found");

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

  let attendance = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.staffAttendance.findUnique({
      where: {
        schoolId_employeeId_date: {
          schoolId: ctx.schoolId,
          employeeId: employee.id,
          date: today,
        },
      },
      include: { attempts: { orderBy: { attemptNumber: "desc" } } },
    }),
  );

  if (attendance?.status === "PRESENT") {
    return { success: true, status: "PRESENT", message: "Already marked present" };
  }

  const lastAttempt = attendance?.attempts[0];
  const attemptNumber = getNextAttemptNumber(lastAttempt);

  if (!attendance) {
    attendance = await withTenantContext(ctx.schoolId, async (tx) =>
      tx.staffAttendance.create({
        data: {
          schoolId: ctx.schoolId,
          employeeId: employee.id,
          userId: ctx.userId,
          date: today,
          status: "PROCESSING",
          geoLat: data.geoLat,
          geoLng: data.geoLng,
        },
        include: { attempts: true },
      }),
    );
  } else {
    await withTenantContext(ctx.schoolId, async (tx) =>
      tx.staffAttendance.update({
        where: { id: attendance!.id },
        data: { status: "PROCESSING", geoLat: data.geoLat, geoLng: data.geoLng },
      }),
    );
  }

  const attempt = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.staffAttendanceAttempt.create({
      data: {
        staffAttendanceId: attendance!.id,
        attemptNumber,
        geoLat: data.geoLat,
        geoLng: data.geoLng,
      },
    }),
  );

  if (attemptNumber >= ATTENDANCE_MAX_ATTEMPTS && data.imageBase64) {
    const evidenceKey = `attendance/evidence/${ctx.userId}/${Date.now()}.jpg`;
    await withTenantContext(ctx.schoolId, async (tx) => {
      await tx.staffAttendanceAttempt.update({
        where: { id: attempt.id },
        data: { evidenceImageKey: evidenceKey },
      });
      await tx.staffAttendance.update({
        where: { id: attendance!.id },
        data: { status: "ESCALATED" },
      });
    });

    const admins = await prisma.userSchoolMembership.findMany({
      where: { schoolId: ctx.schoolId, role: "SCHOOL_ADMIN", isActive: true },
    });

    for (const admin of admins) {
      await enqueueNotification({
        schoolId: ctx.schoolId,
        userId: admin.userId,
        title: "Staff Attendance Escalation",
        body: `${ctx.name} failed face verification 3 times. Manual review required.`,
        metadata: { employeeId: employee.id, attendanceId: attendance!.id },
      });
    }

    revalidatePath("/staff/attendance");
    return { success: false, status: "ESCALATED", attemptNumber };
  }

  let imageKey: string | undefined;
  if (data.imageBase64) {
    const raw = data.imageBase64.includes(",") ? data.imageBase64.split(",")[1]! : data.imageBase64;
    imageKey = buildS3Key(`attendance/verify/${ctx.userId}`, `${attempt.id}.jpg`);
    await putObject(imageKey, Buffer.from(raw, "base64"), "image/jpeg");
  }

  dispatchFaceVerification({
    type: "staff",
    attendanceId: attendance!.id,
    attemptId: attempt.id,
    userId: ctx.userId,
    schoolId: ctx.schoolId,
    attemptNumber,
    imageKey,
  });

  revalidatePath("/staff/attendance");
  return { success: true, status: "PROCESSING", attemptNumber, attendanceId: attendance!.id };
}

export async function getStaffAttendanceStatusAction(attendanceId: string) {
  const { ctx, employee } = await getStaffEmployee();

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.staffAttendance.findFirst({
      where: { id: attendanceId, schoolId: ctx.schoolId, employeeId: employee.id },
      include: { attempts: { orderBy: { attemptNumber: "desc" } } },
    }),
  );
}

export async function listStaffAttendanceAction() {
  const { ctx, employee } = await getStaffEmployee();

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.staffAttendance.findMany({
      where: { schoolId: ctx.schoolId, employeeId: employee.id },
      include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } },
      orderBy: { date: "desc" },
      take: 30,
    }),
  );
}

export async function listEscalatedStaffAttendanceAction() {
  const ctx = await requireSchoolContext();

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.staffAttendance.findMany({
      where: { schoolId: ctx.schoolId, status: "ESCALATED" },
      include: {
        employee: { include: { user: { select: { name: true } } } },
        attempts: { orderBy: { attemptNumber: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export async function overrideStaffAttendanceAction(
  attendanceId: string,
  status: "PRESENT" | "FAILED" | "ABSENT",
) {
  const ctx = await requireSchoolContext();

  const updated = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.staffAttendance.update({
      where: { id: attendanceId, schoolId: ctx.schoolId },
      data: {
        status,
        markedAt: status === "PRESENT" ? new Date() : undefined,
        checkInAt: status === "PRESENT" ? new Date() : undefined,
        method: "manual_override",
      },
    }),
  );

  revalidatePath("/admin/attendance");
  return updated;
}

// Accountant fees view
export async function getAccountantFeesSummaryAction() {
  const { ctx, employee } = await getStaffEmployee();
  assertCapability(employee.jobType, CAPABILITIES.FEES_VIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const [totalPosted, totalPaid, recentPayments] = await Promise.all([
      tx.feeInvoice.aggregate({
        where: { schoolId: ctx.schoolId, status: { in: ["POSTED", "PARTIALLY_PAID", "OVERDUE"] } },
        _sum: { amount: true },
      }),
      tx.payment.aggregate({
        where: { schoolId: ctx.schoolId, status: "SUCCESS" },
        _sum: { amount: true },
      }),
      tx.payment.findMany({
        where: { schoolId: ctx.schoolId, status: "SUCCESS" },
        include: { feeInvoice: { include: { student: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      outstanding: Number(totalPosted._sum.amount ?? 0),
      collected: Number(totalPaid._sum.amount ?? 0),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        studentName: p.feeInvoice.student.name,
        createdAt: p.createdAt,
      })),
    };
  });
}
