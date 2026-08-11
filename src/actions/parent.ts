"use server";

import { z } from "zod";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { ForbiddenError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getPresignedUploadUrl, buildS3Key } from "@/lib/storage/s3";
import { enqueueNotification } from "@/lib/notifications";
import { applyLeaveSubstitutions } from "@/lib/scheduler/smart-scheduler";
import { parseIsoDate } from "@/lib/calendar/working-days";
import { isoDateString } from "@/lib/schemas/date";

export async function getLinkedStudentsAction() {
  const ctx = await requireSchoolContext();

  return withTenantContext(ctx.schoolId, async (tx) => {
    const relationships = await tx.guardianRelationship.findMany({
      where: { parentId: ctx.userId, schoolId: ctx.schoolId },
      include: {
        student: {
          include: {
            classSection: true,
            studentAttendances: { orderBy: { date: "desc" }, take: 10 },
            feeInvoices: { where: { status: { in: ["POSTED", "PARTIALLY_PAID", "OVERDUE"] } } },
          },
        },
      },
    });
    return relationships.map((r) => r.student);
  });
}

const documentUploadSchema = z.object({
  studentId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
});

export async function getDocumentUploadUrlAction(input: z.infer<typeof documentUploadSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.DOCUMENTS_UPLOAD);
  const data = documentUploadSchema.parse(input);
  const mimeType = data.mimeType || "application/octet-stream";

  const key = buildS3Key(`documents/${ctx.schoolId}/${data.studentId}`, data.filename);
  const uploadUrl = await getPresignedUploadUrl(key, mimeType);

  return { uploadUrl, key };
}

const confirmDocumentSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string(),
  s3Key: z.string(),
  mimeType: z.string(),
  documentType: z.enum(["AADHAAR", "BIRTH_CERTIFICATE", "COMMUNITY_CERTIFICATE", "MARKSHEET"]).optional(),
});

export async function confirmDocumentUploadAction(input: z.infer<typeof confirmDocumentSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.DOCUMENTS_UPLOAD);
  const data = confirmDocumentSchema.parse(input);

  const uploaderType = ctx.role === "PARENT" ? "PARENT" : "TEACHER";

  const created = await withTenantContext(ctx.schoolId, async (tx) => {
    const createData: any = {
      schoolId: ctx.schoolId,
      studentId: data.studentId,
      uploadedBy: ctx.userId,
      name: data.name,
      s3Key: data.s3Key,
      mimeType: data.mimeType,
    };

    // include new fields only if Prisma client supports them (avoid runtime errors before migration)
    try {
      const model = (prisma as any)?._dmmf?.modelMap?.Document;
      const hasDocumentType = !!model?.fields?.find((f: any) => f.name === "documentType");
      const hasUploaderType = !!model?.fields?.find((f: any) => f.name === "uploaderType");
      if (hasDocumentType && data.documentType) createData.documentType = data.documentType;
      if (hasUploaderType) createData.uploaderType = uploaderType;
    } catch (err) {
      // ignore and proceed without optional fields
    }

    return tx.document.create({ data: createData });
  });

  // process document (OCR + extraction) asynchronously and update record
  try {
    const { processDocument } = await import("@/lib/ai/documentProcessor");
    // run but don't block the response
    processDocument({
      s3Key: data.s3Key,
      mimeType: data.mimeType,
      documentId: created.id,
      documentType: data.documentType,
      uploaderType,
      studentId: data.studentId,
      schoolId: ctx.schoolId,
      uploadedBy: ctx.userId,
    }).catch((err) => {
      console.error("Document processing failed:", err);
    });
  } catch (err) {
    console.error("Failed to import document processor", err);
  }

  return created;
}

const leaveSchema = z
  .object({
    studentId: z.string().uuid(),
    startDate: isoDateString,
    endDate: isoDateString,
    reason: z.string().min(3),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export async function submitParentLeaveAction(input: z.infer<typeof leaveSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.LEAVE_REQUEST);
  const data = leaveSchema.parse(input);

  const request = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.create({
      data: {
        schoolId: ctx.schoolId,
        requesterId: ctx.userId,
        requesterType: "PARENT",
        studentId: data.studentId,
        startDate: parseIsoDate(data.startDate),
        endDate: parseIsoDate(data.endDate),
        reason: data.reason,
      },
    });
  });

  const admins = await prisma.userSchoolMembership.findMany({
    where: { schoolId: ctx.schoolId, role: "SCHOOL_ADMIN", isActive: true },
  });

  for (const admin of admins) {
    await enqueueNotification({
      schoolId: ctx.schoolId,
      userId: admin.userId,
      title: "New Leave Request",
      body: "A parent submitted a leave request for review.",
      metadata: { leaveRequestId: request.id },
    });
  }

  return request;
}

export async function listParentLeaveRequestsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.findMany({
      where: { requesterId: ctx.userId, requesterType: "PARENT" },
      include: { student: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function listPendingDocumentsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.DOCUMENTS_REVIEW);
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.document.findMany({
      where: { schoolId: ctx.schoolId, status: "PENDING" },
      include: { student: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function listParentDocumentsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    // documents uploaded by this parent or for students linked to this parent
    const relationships = await tx.guardianRelationship.findMany({ where: { parentId: ctx.userId, schoolId: ctx.schoolId } });
    const studentIds = relationships.map((r) => r.studentId);

    return tx.document.findMany({
      where: {
        schoolId: ctx.schoolId,
        OR: [{ uploadedBy: ctx.userId }, { studentId: { in: studentIds } }],
      },
      include: { student: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
}

/** Documents for students in class sections assigned to the current teacher. */
export async function listTeacherStudentDocumentsAction() {
  const ctx = await requireSchoolContext();
  if (ctx.role !== "TEACHER") {
    throw new ForbiddenError("Teachers only");
  }

  return withTenantContext(ctx.schoolId, async (tx) => {
    const assignments = await tx.teacherAssignment.findMany({
      where: { schoolId: ctx.schoolId, teacherId: ctx.userId },
      select: { classSectionId: true },
    });
    const classSectionIds = [...new Set(assignments.map((a) => a.classSectionId))];
    if (classSectionIds.length === 0) return [];

    const students = await tx.student.findMany({
      where: { schoolId: ctx.schoolId, classSectionId: { in: classSectionIds } },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    if (studentIds.length === 0) return [];

    return tx.document.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId: { in: studentIds },
      },
      include: { student: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });
}

export async function reviewDocumentAction(
  documentId: string,
  status: "APPROVED" | "REJECTED",
  reviewNote?: string,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.DOCUMENTS_REVIEW);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.document.update({
      where: { id: documentId, schoolId: ctx.schoolId },
      data: { status, reviewNote },
    });
  });
}

export async function listLeaveRequestsForReviewAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.LEAVE_MANAGE);
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.findMany({
      where: { schoolId: ctx.schoolId },
      include: { requester: true, student: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
}

const reviewLeaveSchema = z.object({
  leaveRequestId: z.string().uuid(),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

export async function reviewLeaveRequestAction(input: z.infer<typeof reviewLeaveSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.LEAVE_MANAGE);
  const data = reviewLeaveSchema.parse(input);

  const updated = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.leaveRequest.update({
      where: { id: data.leaveRequestId, schoolId: ctx.schoolId },
      data: {
        status: data.status,
        reviewedBy: ctx.userId,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote,
      },
    });
  });

  await enqueueNotification({
    schoolId: ctx.schoolId,
    userId: updated.requesterId,
    title: "Leave Request Updated",
    body: `Your leave request was ${data.status.toLowerCase()}.`,
    metadata: { leaveRequestId: updated.id, status: data.status },
  });

  if (data.status === "APPROVED" && updated.requesterType === "TEACHER") {
    await applyLeaveSubstitutions(updated.id, ctx.userId);
  }

  return updated;
}
