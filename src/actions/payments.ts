"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission, revalidateSessionForSensitiveOp } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { encrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { enqueueNotification } from "@/lib/notifications";
import type { PaymentProvider, Prisma } from "@prisma/client";
import {
  createProviderPaymentOrder,
  getEnabledProvidersForSchool,
  getExternalOrderId,
  listAdminProviderConfigs,
} from "@/lib/payments/registry";
import { paymentProviderConfigSchema } from "@/lib/payments/types";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import { completePayment } from "@/lib/payments/complete-payment";
import { getProviderConfig } from "@/lib/payments/registry";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";

const feeStructureSchema = z
  .object({
    name: z.string().min(1),
    amount: z.number().positive(),
    gradeId: z.string().uuid().optional(),
    classSectionId: z.string().uuid().optional(),
    termStart: z.string().optional(),
    termEnd: z.string().optional(),
  })
  .refine(
    (data) => !(data.gradeId && data.classSectionId),
    { message: "Cannot target both grade and class section" },
  );

async function postInvoicesForStructure(
  schoolId: string,
  structure: {
    id: string;
    amount: Prisma.Decimal;
    gradeId: string | null;
    classSectionId: string | null;
  },
) {
  const students = await withTenantContext(schoolId, async (tx) => {
    if (structure.gradeId) {
      return tx.student.findMany({
        where: {
          schoolId,
          classSection: { gradeId: structure.gradeId },
        },
      });
    }
    if (structure.classSectionId) {
      return tx.student.findMany({
        where: { classSectionId: structure.classSectionId },
      });
    }
    return tx.student.findMany({ where: { schoolId } });
  });

  const invoices = await withTenantContext(schoolId, async (tx) => {
    const existing = await tx.feeInvoice.findMany({
      where: {
        feeStructureId: structure.id,
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true },
    });
    const existingStudentIds = new Set(existing.map((e) => e.studentId));

    const created = [];
    for (const student of students) {
      if (existingStudentIds.has(student.id)) continue;

      const invoice = await tx.feeInvoice.create({
        data: {
          schoolId,
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
          schoolId,
          userId: g.parentId,
          title: "New Fee Invoice",
          body: `A fee invoice of ₹${structure.amount} has been posted for ${student.name}.`,
          metadata: { invoiceId: invoice.id },
        });
      }
    }
    return created;
  });

  return invoices;
}

export async function createFeeStructureAction(input: z.infer<typeof feeStructureSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_MANAGE);
  const data = feeStructureSchema.parse(input);

  const structure = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.feeStructure.create({
      data: {
        schoolId: ctx.schoolId,
        name: data.name,
        amount: data.amount,
        gradeId: data.gradeId,
        classSectionId: data.classSectionId,
        termStart: data.termStart ? new Date(data.termStart) : undefined,
        termEnd: data.termEnd ? new Date(data.termEnd) : undefined,
      },
    });
  });

  const invoices = await postInvoicesForStructure(ctx.schoolId, structure);
  const invoiceCount = invoices.length;

  return { structure, invoiceCount };
}

export async function postFeeInvoicesAction(feeStructureId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_MANAGE);

  const structure = await prisma.feeStructure.findFirst({
    where: { id: feeStructureId, schoolId: ctx.schoolId },
  });
  if (!structure) throw new Error("Fee structure not found");

  const invoices = await postInvoicesForStructure(ctx.schoolId, structure);
  return { count: invoices.length };
}

export async function savePaymentProviderConfigAction(
  input: z.infer<typeof paymentProviderConfigSchema>,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYMENTS_CONFIGURE);
  const data = paymentProviderConfigSchema.parse(input);

  const existing = await prisma.schoolPaymentProviderConfig.findUnique({
    where: { schoolId_provider: { schoolId: ctx.schoolId, provider: data.provider } },
  });

  if (!data.isEnabled && !existing) {
    return { saved: true };
  }

  if (data.isEnabled && !existing && (!data.secret || !data.publicKey)) {
    throw new Error("Credentials are required when enabling a payment gateway");
  }

  if (data.isEnabled && existing && !data.publicKey && !existing.publicKey) {
    throw new Error("Public key is required when enabling a payment gateway");
  }

  const configJson: Record<string, unknown> = {
    ...(existing?.configJson as Record<string, unknown> | null),
  };
  if (data.saltIndex) configJson.saltIndex = data.saltIndex;
  if (data.mode) configJson.mode = data.mode;

  const upsertData = {
    isEnabled: data.isEnabled,
    publicKey: data.publicKey?.trim() || existing?.publicKey || "",
    secretEncrypted: data.secret
      ? encrypt(data.secret)
      : existing!.secretEncrypted,
    webhookSecretEncrypted: data.webhookSecret
      ? encrypt(data.webhookSecret)
      : existing?.webhookSecretEncrypted,
    configJson: Object.keys(configJson).length > 0 ? (configJson as Prisma.InputJsonValue) : undefined,
  };

  const config = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.schoolPaymentProviderConfig.upsert({
      where: { schoolId_provider: { schoolId: ctx.schoolId, provider: data.provider } },
      create: {
        schoolId: ctx.schoolId,
        provider: data.provider,
        ...upsertData,
      },
      update: upsertData,
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "payments.provider_config_update",
    schoolId: ctx.schoolId,
    entityType: "SchoolPaymentProviderConfig",
    entityId: config.id,
    metadata: { provider: data.provider, isEnabled: data.isEnabled },
  });

  return { saved: true };
}

export async function listPaymentProviderConfigsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYMENTS_CONFIGURE);
  return listAdminProviderConfigs(ctx.schoolId);
}

export async function listEnabledPaymentProvidersAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);
  return getEnabledProvidersForSchool(ctx.schoolId);
}

export async function listFeeInvoicesForParentAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);
  const students = await prisma.guardianRelationship.findMany({
    where: { parentId: ctx.userId, schoolId: ctx.schoolId },
    select: { studentId: true },
  });

  return withTenantContext(ctx.schoolId, async (tx) => {
    const rows = await tx.feeInvoice.findMany({
      where: {
        schoolId: ctx.schoolId,
        studentId: { in: students.map((s) => s.studentId) },
      },
      include: { student: true, feeStructure: true },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((inv) => ({
      id: inv.id,
      amount: inv.amount.toString(),
      paidAmount: inv.paidAmount.toString(),
      status: inv.status,
      student: { name: inv.student.name },
      feeStructure: { name: inv.feeStructure.name },
    }));
  });
}

export async function createPaymentOrderAction(invoiceId: string, provider: PaymentProvider) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId, ctx.role);

  const invoice = await prisma.feeInvoice.findFirst({
    where: { id: invoiceId, schoolId: ctx.schoolId },
  });
  if (!invoice) throw new Error("Invoice not found");

  const remaining = Number(invoice.amount) - Number(invoice.paidAmount);
  if (remaining <= 0) throw new Error("Invoice already paid");

  const providerConfig = await prisma.schoolPaymentProviderConfig.findUnique({
    where: { schoolId_provider: { schoolId: ctx.schoolId, provider } },
  });
  if (!providerConfig?.isEnabled) {
    throw new Error("Selected payment provider is not enabled");
  }

  const orderResult = await createProviderPaymentOrder(
    ctx.schoolId,
    provider,
    remaining,
    invoice.id,
    `inv_${invoice.id.slice(0, 8)}`,
  );

  const externalOrderId = getExternalOrderId(orderResult);

  const payment = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.payment.create({
      data: {
        schoolId: ctx.schoolId,
        feeInvoiceId: invoice.id,
        amount: remaining,
        provider,
        externalOrderId,
        status: "PENDING",
      },
    });
  });

  return {
    ...orderResult,
    paymentId: payment.id,
  };
}

export async function capturePayPalPaymentAction(paymentId: string, orderId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, schoolId: ctx.schoolId, provider: "PAYPAL", status: "PENDING" },
  });
  if (!payment) throw new Error("Payment not found");

  const config = await prisma.schoolPaymentProviderConfig.findUnique({
    where: { schoolId_provider: { schoolId: ctx.schoolId, provider: "PAYPAL" } },
  });
  if (!config) throw new Error("PayPal not configured");

  const { decrypt } = await import("@/lib/encryption");
  const decryptedConfig = {
    provider: "PAYPAL" as const,
    publicKey: config.publicKey,
    secret: decrypt(config.secretEncrypted),
    webhookSecret: config.webhookSecretEncrypted ? decrypt(config.webhookSecretEncrypted) : undefined,
    configJson: (config.configJson as Record<string, unknown>) ?? undefined,
  };

  const capture = await capturePayPalOrder(decryptedConfig, orderId);

  if (capture.status === "COMPLETED") {
    const result = await completePayment({
      schoolId: ctx.schoolId,
      externalOrderId: orderId,
      externalPaymentId: capture.id,
      paidAmount: Number(payment.amount),
      provider: "PAYPAL",
    });
    if (!result.completed) throw new Error("Payment could not be recorded");
    revalidatePath("/parent/fees");
    revalidatePath("/parent");
    revalidatePath("/admin/fees");
  }

  return { status: capture.status };
}

export async function captureRazorpayPaymentAction(
  paymentId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.FEES_PAY);

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, schoolId: ctx.schoolId, provider: "RAZORPAY", status: "PENDING" },
  });
  if (!payment) throw new Error("Payment not found");

  const config = await getProviderConfig(ctx.schoolId, "RAZORPAY");
  if (!config) throw new Error("Razorpay not configured");

  if (
    !verifyRazorpayPaymentSignature(
      config,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    )
  ) {
    throw new Error("Invalid payment signature");
  }

  const result = await completePayment({
    schoolId: ctx.schoolId,
    externalOrderId: razorpayOrderId,
    externalPaymentId: razorpayPaymentId,
    paidAmount: Number(payment.amount),
    provider: "RAZORPAY",
  });

  if (!result.completed) {
    throw new Error("Payment could not be recorded");
  }

  revalidatePath("/parent/fees");
  revalidatePath("/parent");
  revalidatePath("/admin/fees");

  return { success: true, invoiceId: payment.feeInvoiceId };
}

export async function listFeeStructuresAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.feeStructure.findMany({
      include: {
        classSection: true,
        grade: true,
        _count: { select: { feeInvoices: true } },
      },
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
