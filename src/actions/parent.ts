"use server";

import { z } from "zod";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getPresignedUploadUrl, buildS3Key } from "@/lib/storage/s3";
import { enqueueNotification } from "@/lib/notifications";

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

  const key = buildS3Key(`documents/${ctx.schoolId}/${data.studentId}`, data.filename);
  const uploadUrl = await getPresignedUploadUrl(key, data.mimeType);

  return { uploadUrl, key };
}

const confirmDocumentSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string(),
  s3Key: z.string(),
  mimeType: z.string(),
});

export async function confirmDocumentUploadAction(input: z.infer<typeof confirmDocumentSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.DOCUMENTS_UPLOAD);
  const data = confirmDocumentSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.document.create({
      data: {
        schoolId: ctx.schoolId,
        studentId: data.studentId,
        uploadedBy: ctx.userId,
        name: data.name,
        s3Key: data.s3Key,
        mimeType: data.mimeType,
      },
    });
  });
}

const leaveSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(3),
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
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
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
      where: { schoolId: ctx.schoolId, status: "PENDING" },
      include: { requester: true, student: true },
      orderBy: { createdAt: "desc" },
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

  return updated;
}
