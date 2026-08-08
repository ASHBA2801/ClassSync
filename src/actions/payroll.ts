"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import {
  requireSchoolContext,
  requireSchoolPermission,
  revalidateSessionForSensitiveOp,
} from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createAuditLog } from "@/lib/audit";
import { parseSalaryComponents } from "@/lib/employees/salary";
import { executePayrollPayouts } from "@/lib/payouts/execute";
import { collectPayrollReadiness } from "@/lib/payroll/readiness";
import {
  generateMonthlyPayrollForSchool,
  startPayrollPayoutForSchool,
} from "@/lib/payroll/run-monthly";
import { generatePayrollRunCore } from "@/lib/payroll/generate";

const generatePayrollSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
});

const monthlyPayrollSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export async function listPayrollRunsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);

  const runs = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.payrollRun.findMany({
      where: { schoolId: ctx.schoolId },
      include: {
        approvedBy: { select: { name: true } },
        _count: { select: { payouts: true } },
      },
      orderBy: { periodStart: "desc" },
    }),
  );

  return runs.map((run) => ({
    id: run.id,
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    status: run.status,
    totalAmount: run.totalAmount.toString(),
    employeeCount: run.employeeCount,
    approvedBy: run.approvedBy,
    _count: run._count,
  }));
}

export async function getPayrollRunAction(id: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id, schoolId: ctx.schoolId },
      include: {
        approvedBy: { select: { name: true } },
        payouts: {
          include: {
            employee: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
      },
    });
    return run;
  });
}

export async function generatePayrollRunAction(input: z.infer<typeof generatePayrollSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);
  const data = generatePayrollSchema.parse(input);
  const run = await generatePayrollRunCore(
    ctx.schoolId,
    ctx.userId,
    new Date(data.periodStart),
    new Date(data.periodEnd),
  );

  revalidatePath("/admin/employees/payroll");
  return { payrollRunId: run.id };
}

export async function getPayrollReadinessAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);
  return collectPayrollReadiness(ctx.schoolId);
}

export async function generateMonthlyPayrollAction(input: z.infer<typeof monthlyPayrollSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);
  const data = monthlyPayrollSchema.parse(input);
  const result = await generateMonthlyPayrollForSchool(
    ctx.schoolId,
    ctx.userId,
    data.year,
    data.month,
    async ({ periodStart, periodEnd }) => {
      const run = await generatePayrollRunCore(
        ctx.schoolId,
        ctx.userId,
        new Date(periodStart),
        new Date(periodEnd),
      );
      return { payrollRunId: run.id };
    },
  );
  revalidatePath("/admin/employees/payroll");
  revalidatePath("/admin");
  return result;
}

export async function startPayrollPayoutAction(payrollRunId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_EXECUTE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId);

  const result = await startPayrollPayoutForSchool(ctx.schoolId, payrollRunId, ctx.userId);

  revalidatePath("/admin/employees/payroll");
  revalidatePath("/admin/employees/payouts");
  revalidatePath(`/admin/employees/payroll/${payrollRunId}`);
  revalidatePath("/admin");
  return result;
}

export async function getPendingManualPayrollReminderAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);
  const readiness = await collectPayrollReadiness(ctx.schoolId);
  if (readiness.autoPayoutEnabled) return null;
  if (readiness.previousMonth.status === "completed") return null;
  return {
    monthLabel: readiness.previousMonth.label,
    status: readiness.previousMonth.status,
    payrollRunId: readiness.previousMonth.payrollRunId,
  };
}

export async function approvePayrollRunAction(payrollRunId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_APPROVE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId: ctx.schoolId },
    });
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "DRAFT") throw new Error("Only draft payroll runs can be approved");

    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: "APPROVED",
        approvedById: ctx.userId,
        approvedAt: new Date(),
      },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "payroll.approve",
    schoolId: ctx.schoolId,
    entityType: "PayrollRun",
    entityId: payrollRunId,
  });

  revalidatePath("/admin/employees/payroll");
  revalidatePath(`/admin/employees/payroll/${payrollRunId}`);
  return { success: true };
}

export async function executePayrollRunAction(payrollRunId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_EXECUTE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId);

  const result = await executePayrollPayouts(ctx.schoolId, payrollRunId, ctx.userId);

  revalidatePath("/admin/employees/payroll");
  revalidatePath("/admin/employees/payouts");
  revalidatePath(`/admin/employees/payroll/${payrollRunId}`);
  return result;
}

export async function markPayoutPaidManuallyAction(payoutId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_EXECUTE);
  await revalidateSessionForSensitiveOp(ctx.userId, ctx.schoolId);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const payout = await tx.salaryPayout.findFirst({
      where: { id: payoutId, schoolId: ctx.schoolId },
    });
    if (!payout) throw new Error("Payout not found");
    if (payout.status === "SUCCESS") return;

    await tx.salaryPayout.update({
      where: { id: payoutId },
      data: { status: "SUCCESS", paidAt: new Date() },
    });
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "payout.manual_paid",
    schoolId: ctx.schoolId,
    entityType: "SalaryPayout",
    entityId: payoutId,
  });

  revalidatePath("/admin/employees/payouts");
  return { success: true };
}

export async function listSalaryPayoutsAction(payrollRunId?: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) =>
    tx.salaryPayout.findMany({
      where: {
        schoolId: ctx.schoolId,
        ...(payrollRunId ? { payrollRunId } : {}),
      },
      include: {
        employee: { include: { user: { select: { name: true, email: true } } } },
        payrollRun: { select: { periodStart: true, periodEnd: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  );
}

export async function getMySalarySlipsAction() {
  const ctx = await requireSchoolContext();
  if (!ctx.permissions.includes(PERMISSIONS.PAYROLL_VIEW)) {
    throw new Error("Not authorized");
  }

  return withTenantContext(ctx.schoolId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { schoolId_userId: { schoolId: ctx.schoolId, userId: ctx.userId } },
    });
    if (!employee) return [];

    const payouts = await tx.salaryPayout.findMany({
      where: { employeeId: employee.id, schoolId: ctx.schoolId },
      include: { payrollRun: true },
      orderBy: { createdAt: "desc" },
    });

    return payouts.map((p) => ({
      id: p.id,
      periodStart: p.payrollRun.periodStart,
      periodEnd: p.payrollRun.periodEnd,
      grossAmount: Number(p.grossAmount),
      netAmount: Number(p.netAmount),
      deductions: parseSalaryComponents(p.deductions),
      status: p.status,
      paidAt: p.paidAt,
    }));
  });
}

export async function getSalarySlipAction(payoutId: string) {
  const ctx = await requireSchoolContext();

  return withTenantContext(ctx.schoolId, async (tx) => {
    const payout = await tx.salaryPayout.findFirst({
      where: { id: payoutId, schoolId: ctx.schoolId },
      include: {
        employee: { include: { user: true } },
        payrollRun: true,
      },
    });
    if (!payout) return null;

    const canViewAll = ctx.permissions.includes(PERMISSIONS.PAYROLL_MANAGE);
    if (!canViewAll && payout.employee.userId !== ctx.userId) return null;

    return {
      id: payout.id,
      employeeName: payout.employee.user.name,
      employeeCode: payout.employee.employeeCode,
      periodStart: payout.payrollRun.periodStart,
      periodEnd: payout.payrollRun.periodEnd,
      grossAmount: Number(payout.grossAmount),
      netAmount: Number(payout.netAmount),
      deductions: parseSalaryComponents(payout.deductions),
      status: payout.status,
      paidAt: payout.paidAt,
    };
  });
}
