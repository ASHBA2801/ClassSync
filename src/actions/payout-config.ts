"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolPermission, revalidateSessionForSensitiveOp } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { encrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";

const payoutConfigSchema = z.object({
  razorpayXAccountNumber: z.string().min(5),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  webhookSecret: z.string().optional(),
  isEnabled: z.boolean(),
  autoPayoutEnabled: z.boolean().default(false),
  payrollRunDay: z.number().int().min(0).max(28).default(0),
});

export async function getPayoutConfigAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYOUTS_CONFIGURE);

  const config = await prisma.schoolPayoutConfig.findUnique({
    where: { schoolId: ctx.schoolId },
  });

  if (!config) {
    return {
      isConfigured: false,
      isEnabled: false,
      accountNumber: null,
      autoPayoutEnabled: false,
      payrollRunDay: 0,
    };
  }

  return {
    isConfigured: true,
    isEnabled: config.isEnabled,
    accountNumber: config.razorpayXAccountNumber,
    autoPayoutEnabled: config.autoPayoutEnabled,
    payrollRunDay: config.payrollRunDay,
  };
}

export async function savePayoutConfigAction(input: z.infer<typeof payoutConfigSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYOUTS_CONFIGURE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId);
  const data = payoutConfigSchema.parse(input);

  if (data.autoPayoutEnabled && !data.isEnabled) {
    throw new Error("Enable RazorpayX payouts before turning on automatic payroll");
  }

  await withTenantContext(ctx.schoolId, async (tx) => {
    const existing = await tx.schoolPayoutConfig.findUnique({
      where: { schoolId: ctx.schoolId },
    });

    if (data.isEnabled && !existing && (!data.apiKey || !data.apiSecret)) {
      throw new Error("API credentials are required when enabling RazorpayX");
    }

    if (existing) {
      await tx.schoolPayoutConfig.update({
        where: { schoolId: ctx.schoolId },
        data: {
          razorpayXAccountNumber: data.razorpayXAccountNumber,
          apiKeyEncrypted: data.apiKey ? encrypt(data.apiKey) : existing.apiKeyEncrypted,
          apiSecretEncrypted: data.apiSecret ? encrypt(data.apiSecret) : existing.apiSecretEncrypted,
          webhookSecretEncrypted: data.webhookSecret
            ? encrypt(data.webhookSecret)
            : existing.webhookSecretEncrypted,
          isEnabled: data.isEnabled,
          autoPayoutEnabled: data.autoPayoutEnabled,
          payrollRunDay: data.payrollRunDay,
        },
      });
    } else {
      await tx.schoolPayoutConfig.create({
        data: {
          schoolId: ctx.schoolId,
          razorpayXAccountNumber: data.razorpayXAccountNumber,
          apiKeyEncrypted: encrypt(data.apiKey!),
          apiSecretEncrypted: encrypt(data.apiSecret!),
          webhookSecretEncrypted: data.webhookSecret ? encrypt(data.webhookSecret) : null,
          isEnabled: data.isEnabled,
          autoPayoutEnabled: data.autoPayoutEnabled,
          payrollRunDay: data.payrollRunDay,
        },
      });
    }
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "payout.config.save",
    schoolId: ctx.schoolId,
    entityType: "SchoolPayoutConfig",
    entityId: ctx.schoolId,
    metadata: {
      isEnabled: data.isEnabled,
      autoPayoutEnabled: data.autoPayoutEnabled,
      payrollRunDay: data.payrollRunDay,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/employees/payroll");
  return { success: true };
}
