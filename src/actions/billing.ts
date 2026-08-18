"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, withSystemAdminContext, withTenantContext } from "@/lib/db/prisma";
import {
  requireRole,
  requireSchoolPermission,
  revalidateSessionForSensitiveOp,
} from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createAuditLog } from "@/lib/audit";
import { countBillableUsers, isSubscriptionCurrent } from "@/lib/billing/users";
import { activateSchoolPlan } from "@/lib/billing/subscription";
import {
  createProviderPaymentOrder,
  getEnabledProvidersForSchool,
  getExternalOrderId,
  getProviderConfig,
} from "@/lib/payments/registry";
import { completePayment } from "@/lib/payments/complete-payment";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import type { PaymentProvider } from "@prisma/client";

const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  maxUsers: z.number().int().positive(),
  priceAmount: z.number().nonnegative(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

function serializePlan(plan: {
  id: string;
  name: string;
  description: string | null;
  maxUsers: number;
  priceAmount: { toString(): string };
  currency: string;
  interval: string;
  isActive: boolean;
  sortOrder: number;
}) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    maxUsers: plan.maxUsers,
    priceAmount: plan.priceAmount.toString(),
    currency: plan.currency,
    interval: plan.interval,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

export async function listCorePricingPlansAction(includeInactive = false) {
  const ctx = await requireRole(["SYSTEM_ADMIN", "SCHOOL_ADMIN"]);
  const plans = await prisma.corePricingPlan.findMany({
    where: includeInactive || ctx.role === "SYSTEM_ADMIN" ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { maxUsers: "asc" }],
  });
  return plans.map(serializePlan);
}

export async function saveCorePricingPlanAction(input: z.infer<typeof planSchema>) {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);
  const data = planSchema.parse(input);

  const saved = await withSystemAdminContext(async (tx) => {
    if (data.id) {
      return tx.corePricingPlan.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          maxUsers: data.maxUsers,
          priceAmount: data.priceAmount,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? data.maxUsers,
        },
      });
    }
    return tx.corePricingPlan.create({
      data: {
        name: data.name,
        description: data.description,
        maxUsers: data.maxUsers,
        priceAmount: data.priceAmount,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? data.maxUsers,
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: data.id ? "billing.plan_update" : "billing.plan_create",
    entityType: "CorePricingPlan",
    entityId: saved.id,
    metadata: { name: saved.name, maxUsers: saved.maxUsers, priceAmount: data.priceAmount },
  });

  revalidatePath("/system/billing");
  revalidatePath("/admin/billing");
  return serializePlan(saved);
}

export async function setCorePricingPlanActiveAction(planId: string, isActive: boolean) {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);
  await withSystemAdminContext(async (tx) => {
    await tx.corePricingPlan.update({ where: { id: planId }, data: { isActive } });
  });
  await createAuditLog({
    actorId: ctx.userId,
    action: "billing.plan_toggle",
    entityType: "CorePricingPlan",
    entityId: planId,
    metadata: { isActive },
  });
  revalidatePath("/system/billing");
  revalidatePath("/admin/billing");
}

export async function assignCorePlanAction(schoolId: string, planId: string) {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);
  const plan = await prisma.corePricingPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found");

  await withSystemAdminContext(async (tx) => {
    await activateSchoolPlan(tx, schoolId, plan);
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "billing.plan_assign",
    schoolId,
    entityType: "SchoolSubscription",
    entityId: schoolId,
    metadata: { planId, planName: plan.name, maxUsers: plan.maxUsers },
  });

  revalidatePath("/system/billing");
  revalidatePath("/admin/billing");
  return { assigned: true };
}

export async function listSchoolSubscriptionsOverviewAction() {
  await requireRole(["SYSTEM_ADMIN"]);
  return withSystemAdminContext(async (tx) => {
    const schools = await tx.school.findMany({
      orderBy: { name: "asc" },
      include: {
        coreSubscription: { include: { plan: true } },
      },
    });

    const rows = [];
    for (const school of schools) {
      const billableUsers = await countBillableUsers(tx, school.id);
      const sub = school.coreSubscription;
      const current = isSubscriptionCurrent(sub);
      rows.push({
        schoolId: school.id,
        schoolName: school.name,
        schoolStatus: school.status,
        billableUsers,
        userLimit: current ? sub!.userLimit : null,
        planName: current ? sub!.plan.name : null,
        planId: current ? sub!.planId : null,
        status: current ? sub!.status : sub ? "EXPIRED" : "NONE",
        periodEnd: current
          ? sub!.currentPeriodEnd.toISOString()
          : (sub?.currentPeriodEnd.toISOString() ?? null),
      });
    }
    return rows;
  });
}

export async function getSchoolBillingSnapshotAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.BILLING_MANAGE);
  return withTenantContext(ctx.schoolId, async (tx) => {
    const [plans, subscription, billableUsers, invoices] = await Promise.all([
      prisma.corePricingPlan.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { maxUsers: "asc" }],
      }),
      tx.schoolSubscription.findUnique({
        where: { schoolId: ctx.schoolId },
        include: { plan: true },
      }),
      countBillableUsers(tx, ctx.schoolId),
      tx.coreModuleInvoice.findMany({
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const providers = await getEnabledProvidersForSchool(ctx.schoolId);
    const current = isSubscriptionCurrent(subscription);

    return {
      billableUsers,
      providers,
      subscription: subscription
        ? {
            planId: subscription.planId,
            planName: subscription.plan.name,
            userLimit: subscription.userLimit,
            status: current ? subscription.status : "EXPIRED",
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            overLimit: current ? billableUsers > subscription.userLimit : false,
          }
        : null,
      plans: plans.map(serializePlan),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        planName: inv.plan.name,
        amount: inv.amount.toString(),
        status: inv.status,
        provider: inv.provider,
        createdAt: inv.createdAt.toISOString(),
      })),
    };
  });
}

export async function createCoreModulePaymentOrderAction(planId: string, provider: PaymentProvider) {
  const ctx = await requireSchoolPermission(PERMISSIONS.BILLING_MANAGE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId, ctx.role);

  const plan = await prisma.corePricingPlan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) throw new Error("Plan not found");

  const amount = Number(plan.priceAmount);
  if (amount <= 0) {
    await withTenantContext(ctx.schoolId, async (tx) => {
      await activateSchoolPlan(tx, ctx.schoolId, plan);
    });
    revalidatePath("/admin/billing");
    return { provider: "FREE" as const, activated: true };
  }

  const providerConfig = await prisma.schoolPaymentProviderConfig.findUnique({
    where: { schoolId_provider: { schoolId: ctx.schoolId, provider } },
  });
  if (!providerConfig?.isEnabled) {
    throw new Error("Selected payment provider is not enabled. Configure it in Settings.");
  }

  const invoice = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.coreModuleInvoice.create({
      data: {
        schoolId: ctx.schoolId,
        planId: plan.id,
        amount: plan.priceAmount,
        status: "PENDING",
        provider,
      },
    });
  });

  const orderResult = await createProviderPaymentOrder(
    ctx.schoolId,
    provider,
    amount,
    invoice.id,
    `core_${invoice.id.slice(0, 8)}`,
    { returnPath: "/admin/billing", productName: `ClassSync ${plan.name}` },
  );

  const externalOrderId = getExternalOrderId(orderResult);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.coreModuleInvoice.update({
      where: { id: invoice.id },
      data: { externalOrderId },
    });
  });

  return {
    ...orderResult,
    invoiceId: invoice.id,
  };
}

export async function captureCoreModuleRazorpayAction(
  invoiceId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.BILLING_MANAGE);

  const invoice = await prisma.coreModuleInvoice.findFirst({
    where: { id: invoiceId, schoolId: ctx.schoolId, provider: "RAZORPAY", status: "PENDING" },
  });
  if (!invoice) throw new Error("Invoice not found");

  const config = await getProviderConfig(ctx.schoolId, "RAZORPAY");
  if (!config) throw new Error("Razorpay not configured");

  if (
    !verifyRazorpayPaymentSignature(config, razorpayOrderId, razorpayPaymentId, razorpaySignature)
  ) {
    throw new Error("Invalid payment signature");
  }

  const result = await completePayment({
    schoolId: ctx.schoolId,
    externalOrderId: razorpayOrderId,
    externalPaymentId: razorpayPaymentId,
    paidAmount: Number(invoice.amount),
    provider: "RAZORPAY",
  });

  if (!result.completed) throw new Error("Payment could not be recorded");

  revalidatePath("/admin/billing");
  revalidatePath("/system/billing");
  return { success: true };
}

export async function captureCoreModulePayPalAction(invoiceId: string, orderId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.BILLING_MANAGE);

  const invoice = await prisma.coreModuleInvoice.findFirst({
    where: { id: invoiceId, schoolId: ctx.schoolId, provider: "PAYPAL", status: "PENDING" },
  });
  if (!invoice) throw new Error("Invoice not found");

  const config = await getProviderConfig(ctx.schoolId, "PAYPAL");
  if (!config) throw new Error("PayPal not configured");

  const capture = await capturePayPalOrder(config, orderId);
  if (capture.status !== "COMPLETED") {
    throw new Error("PayPal capture was not completed");
  }

  const result = await completePayment({
    schoolId: ctx.schoolId,
    externalOrderId: orderId,
    externalPaymentId: capture.id,
    paidAmount: Number(invoice.amount),
    provider: "PAYPAL",
  });
  if (!result.completed) throw new Error("Payment could not be recorded");

  revalidatePath("/admin/billing");
  revalidatePath("/system/billing");
  return { success: true };
}
