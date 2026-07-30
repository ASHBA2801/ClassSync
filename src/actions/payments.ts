"use server";

import { z } from "zod";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission, revalidateSessionForSensitiveOp } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { encrypt } from "@/lib/encryption";
import { createPaymentOrder } from "@/lib/payments/razorpay";
import { createAuditLog } from "@/lib/audit";
import { enqueueNotification } from "@/lib/notifications";

const feeStructureSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  classSectionId: z.string().uuid().optional(),
  termStart: z.string().optional(),
  termEnd: z.string().optional(),
});

export async function createFeeStructureAction(input: z.infer<typeof feeStructureSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_MANAGE);
  const data = feeStructureSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.feeStructure.create({
      data: {
        schoolId: ctx.schoolId,
        name: data.name,
        amount: data.amount,
        classSectionId: data.classSectionId,
        termStart: data.termStart ? new Date(data.termStart) : undefined,
        termEnd: data.termEnd ? new Date(data.termEnd) : undefined,
      },
    });
  });
}

export async function postFeeInvoicesAction(feeStructureId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_MANAGE);

  const structure = await prisma.feeStructure.findFirst({
    where: { id: feeStructureId, schoolId: ctx.schoolId },
  });
  if (!structure) throw new Error("Fee structure not found");

  const students = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.student.findMany({
      where: structure.classSectionId
        ? { classSectionId: structure.classSectionId }
        : { schoolId: ctx.schoolId },
    });
  });

  const invoices = await withTenantContext(ctx.schoolId, async (tx) => {
    const created = [];
    for (const student of students) {
      const invoice = await tx.feeInvoice.create({
        data: {
          schoolId: ctx.schoolId,
          studentId: student.id,
          feeStructureId: structure.id,
          amount: structure.amount,
          status: "POSTED",
        },
      });
      created.push(invoice);

      const guardians = await tx.guardianRelationship.findMany({
        where: { studentId: student.id },
      });

      for (const g of guardians) {
        await enqueueNotification({
          schoolId: ctx.schoolId,
          userId: g.parentId,
          title: "New Fee Invoice",
          body: `A fee invoice of ₹${structure.amount} has been posted for ${student.name}.`,
          metadata: { invoiceId: invoice.id },
        });
      }
    }
    return created;
  });

  return { count: invoices.length };
}

const paymentConfigSchema = z.object({
  razorpayKeyId: z.string().min(1),
  razorpayKeySecret: z.string().min(1),
  webhookSecret: z.string().optional(),
});

export async function savePaymentConfigAction(input: z.infer<typeof paymentConfigSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYMENTS_CONFIGURE);
  const data = paymentConfigSchema.parse(input);

  const config = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.schoolPaymentConfig.upsert({
      where: { schoolId: ctx.schoolId },
      create: {
        schoolId: ctx.schoolId,
        razorpayKeyId: data.razorpayKeyId,
        razorpayKeySecretEncrypted: encrypt(data.razorpayKeySecret),
        webhookSecretEncrypted: data.webhookSecret ? encrypt(data.webhookSecret) : null,
      },
      update: {
        razorpayKeyId: data.razorpayKeyId,
        razorpayKeySecretEncrypted: encrypt(data.razorpayKeySecret),
        webhookSecretEncrypted: data.webhookSecret ? encrypt(data.webhookSecret) : undefined,
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "payments.config_update",
    schoolId: ctx.schoolId,
    entityType: "SchoolPaymentConfig",
    entityId: config.id,
  });

  return { saved: true };
}

export async function listFeeInvoicesForParentAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);
  const students = await prisma.guardianRelationship.findMany({
    where: { parentId: ctx.userId, schoolId: ctx.schoolId },
    select: { studentId: true },
  });

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.feeInvoice.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId: { in: students.map((s) => s.studentId) },
      },
      include: { student: true, feeStructure: true, payments: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function createPaymentOrderAction(invoiceId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId);

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: invoiceId, schoolId: ctx.schoolId },
  });
  if (!invoice) throw new Error("Invoice not found");

  const remaining = Number(invoice.amount) - Number(invoice.paidAmount);
  if (remaining <= 0) throw new Error("Invoice already paid");

  const order = await createPaymentOrder(
    ctx.schoolId,
    remaining,
    invoice.id,
    `inv_${invoice.id.slice(0, 8)}`,
  );

  const payment = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.payment.create({
      data: {
        schoolId: ctx.schoolId,
        feeInvoiceId: invoice.id,
        amount: remaining,
        razorpayOrderId: order.id,
        status: "PENDING",
      },
    });
  });

  const config = await prisma.schoolPaymentConfig.findUnique({
    where: { schoolId: ctx.schoolId },
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config?.razorpayKeyId,
    paymentId: payment.id,
  };
}

export async function listFeeStructuresAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.feeStructure.findMany({
      include: { classSection: true, _count: { select: { feeInvoices: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function listSchoolPaymentsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_MANAGE);
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.payment.findMany({
      include: { feeInvoice: { include: { student: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
}
