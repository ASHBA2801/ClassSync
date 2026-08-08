import { prisma, withTenantContext } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { executePayrollPayouts } from "@/lib/payouts/execute";
import { getMonthPeriodBounds } from "./period";
import { validatePayrollRunPayoutReadiness } from "./readiness";

type GenerateFn = (input: { periodStart: string; periodEnd: string }) => Promise<{ payrollRunId: string }>;

export async function generateMonthlyPayrollForSchool(
  schoolId: string,
  actorId: string,
  year: number,
  month: number,
  generateFn: GenerateFn,
): Promise<{ payrollRunId: string }> {
  const { periodStart, periodEnd } = getMonthPeriodBounds(year, month);
  return generateFn({
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
  });
}

export async function approvePayrollRunInternal(
  schoolId: string,
  payrollRunId: string,
  actorId: string,
): Promise<void> {
  await withTenantContext(schoolId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
    });
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "DRAFT") return;

    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: "APPROVED",
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });
  });

  await createAuditLog({
    actorId,
    action: "payroll.approve",
    schoolId,
    entityType: "PayrollRun",
    entityId: payrollRunId,
  });
}

export async function startPayrollPayoutForSchool(
  schoolId: string,
  payrollRunId: string,
  actorId: string,
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  const validation = await validatePayrollRunPayoutReadiness(schoolId, payrollRunId);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  await withTenantContext(schoolId, async (tx) => {
    const run = await tx.payrollRun.findFirst({ where: { id: payrollRunId, schoolId } });
    if (!run) throw new Error("Payroll run not found");
    if (run.status === "DRAFT") {
      await approvePayrollRunInternal(schoolId, payrollRunId, actorId);
    } else if (run.status !== "APPROVED") {
      throw new Error(`Cannot start payout for payroll run in status ${run.status}`);
    }
  });

  return executePayrollPayouts(schoolId, payrollRunId, actorId);
}

export async function runAutoMonthlyPayroll(
  schoolId: string,
  systemActorId: string,
  year: number,
  month: number,
  generateFn: GenerateFn,
): Promise<{ payrollRunId: string; result: { successCount: number; failCount: number; errors: string[] } } | { error: string }> {
  const { payrollRunId } = await generateMonthlyPayrollForSchool(schoolId, systemActorId, year, month, generateFn);
  const result = await startPayrollPayoutForSchool(schoolId, payrollRunId, systemActorId);
  return { payrollRunId, result };
}

export async function getSchoolAdminUserIds(schoolId: string): Promise<string[]> {
  const admins = await prisma.userSchoolMembership.findMany({
    where: { schoolId, role: "SCHOOL_ADMIN", isActive: true },
    select: { userId: true },
  });
  return admins.map((a) => a.userId);
}
