import type { PayrollRunStatus } from "@prisma/client";
import { withTenantContext } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  fetchRazorpayPayout,
  formatPayrollNarration,
  getPayoutConfig,
  initiateEmployeePayout,
  mapRazorpayPayoutStatus,
} from "./razorpayx";

async function reconcilePayrollRunStatus(
  tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
  payrollRunId: string,
  schoolId: string,
) {
  const payouts = await tx.salaryPayout.findMany({
    where: { payrollRunId, schoolId },
    select: { status: true },
  });
  if (payouts.length === 0) return;

  const hasOpen = payouts.some((p) => p.status === "PROCESSING" || p.status === "PENDING");
  const allSuccess = payouts.every((p) => p.status === "SUCCESS");
  const allFailed = payouts.every((p) => p.status === "FAILED");

  let runStatus: PayrollRunStatus;
  if (hasOpen) runStatus = "PROCESSING";
  else if (allSuccess) runStatus = "COMPLETED";
  else if (allFailed) runStatus = "FAILED";
  else runStatus = "COMPLETED";

  await tx.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: runStatus },
  });
}

async function applyRazorpayPayoutStatus(
  schoolId: string,
  razorpayPayoutId: string,
  razorpayStatus: string,
  failureReason?: string | null,
) {
  await withTenantContext(schoolId, async (tx) => {
    const payout = await tx.salaryPayout.findFirst({
      where: { razorpayPayoutId, schoolId },
    });
    if (!payout) return;

    const mappedStatus = mapRazorpayPayoutStatus(razorpayStatus);
    await tx.salaryPayout.update({
      where: { id: payout.id },
      data: {
        status: mappedStatus,
        failureReason: mappedStatus === "FAILED" ? (failureReason ?? null) : null,
        paidAt: mappedStatus === "SUCCESS" ? (payout.paidAt ?? new Date()) : payout.paidAt,
      },
    });

    await reconcilePayrollRunStatus(tx, payout.payrollRunId, schoolId);
  });
}

export async function syncPayrollPayoutStatusesFromRazorpay(
  schoolId: string,
  payrollRunId: string,
): Promise<{ synced: number; updated: number }> {
  const config = await getPayoutConfig(schoolId);
  if (!config) return { synced: 0, updated: 0 };

  const processingPayouts = await withTenantContext(schoolId, async (tx) =>
    tx.salaryPayout.findMany({
      where: {
        payrollRunId,
        schoolId,
        status: "PROCESSING",
        razorpayPayoutId: { not: null },
      },
      select: { id: true, razorpayPayoutId: true, status: true },
    }),
  );

  let updated = 0;
  for (const payout of processingPayouts) {
    if (!payout.razorpayPayoutId) continue;

    try {
      const remote = await fetchRazorpayPayout(config, payout.razorpayPayoutId);
      const mappedStatus = mapRazorpayPayoutStatus(remote.status);
      if (mappedStatus !== payout.status) {
        await applyRazorpayPayoutStatus(
          schoolId,
          payout.razorpayPayoutId,
          remote.status,
          remote.failure_reason,
        );
        updated++;
      }
    } catch {
      // Ignore individual fetch failures; other payouts can still sync.
    }
  }

  return { synced: processingPayouts.length, updated };
}

export async function executePayrollPayouts(
  schoolId: string,
  payrollRunId: string,
  actorId: string,
) {
  const { payouts, periodStart, useRazorpay } = await withTenantContext(schoolId, async (tx) => {
    const run = await tx.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: { payouts: { where: { status: "PENDING" } } },
    });
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "APPROVED") throw new Error("Payroll run must be approved before payout");

    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: "PROCESSING" },
    });

    const config = await tx.schoolPayoutConfig.findUnique({ where: { schoolId } });

    return {
      payouts: run.payouts,
      periodStart: run.periodStart,
      useRazorpay: config?.isEnabled ?? false,
    };
  });

  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const payout of payouts) {
    try {
      if (Number(payout.netAmount) <= 0) {
        await withTenantContext(schoolId, async (tx) => {
          await tx.salaryPayout.update({
            where: { id: payout.id },
            data: { status: "SUCCESS", paidAt: new Date() },
          });
        });
        successCount++;
        continue;
      }

      if (!useRazorpay) {
        await withTenantContext(schoolId, async (tx) => {
          await tx.salaryPayout.update({
            where: { id: payout.id },
            data: { status: "PROCESSING" },
          });
        });
        errors.push(`Payout ${payout.id}: RazorpayX not configured — use manual mark paid`);
        failCount++;
        continue;
      }

      await withTenantContext(schoolId, async (tx) => {
        await tx.salaryPayout.update({
          where: { id: payout.id },
          data: { status: "PROCESSING" },
        });
      });

      const result = await initiateEmployeePayout({
        schoolId,
        employeeId: payout.employeeId,
        amount: Number(payout.netAmount),
        idempotencyKey: payout.idempotencyKey,
        narration: formatPayrollNarration(periodStart),
      });

      const mappedStatus = mapRazorpayPayoutStatus(result.status);

      await withTenantContext(schoolId, async (tx) => {
        await tx.salaryPayout.update({
          where: { id: payout.id },
          data: {
            razorpayPayoutId: result.payoutId,
            status: mappedStatus,
            paidAt: mappedStatus === "SUCCESS" ? new Date() : null,
          },
        });
      });

      successCount++;
    } catch (err) {
      failCount++;
      const message = err instanceof Error ? err.message : "Payout failed";
      errors.push(message);

      await withTenantContext(schoolId, async (tx) => {
        await tx.salaryPayout.update({
          where: { id: payout.id },
          data: { status: "FAILED", failureReason: message },
        });
      });
    }
  }

  await syncPayrollPayoutStatusesFromRazorpay(schoolId, payrollRunId);

  await withTenantContext(schoolId, async (tx) => {
    await reconcilePayrollRunStatus(tx, payrollRunId, schoolId);
  });

  await createAuditLog({
    actorId,
    action: "payroll.execute",
    schoolId,
    entityType: "PayrollRun",
    entityId: payrollRunId,
    metadata: { successCount, failCount, useRazorpay },
  });

  return { successCount, failCount, errors };
}

export async function retryFailedPayrollPayouts(
  schoolId: string,
  payrollRunId: string,
  actorId: string,
) {
  const failedCount = await withTenantContext(schoolId, async (tx) => {
    const run = await tx.payrollRun.findFirst({ where: { id: payrollRunId, schoolId } });
    if (!run) throw new Error("Payroll run not found");
    if (!["COMPLETED", "FAILED", "PROCESSING"].includes(run.status)) {
      throw new Error("Cannot retry payouts for this payroll run");
    }

    const result = await tx.salaryPayout.updateMany({
      where: { payrollRunId, schoolId, status: "FAILED" },
      data: { status: "PENDING", failureReason: null },
    });

    if (result.count === 0) {
      throw new Error("No failed payouts to retry");
    }

    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: "APPROVED" },
    });

    return result.count;
  });

  const result = await executePayrollPayouts(schoolId, payrollRunId, actorId);

  await createAuditLog({
    actorId,
    action: "payroll.retry_failed",
    schoolId,
    entityType: "PayrollRun",
    entityId: payrollRunId,
    metadata: { failedCount, ...result },
  });

  return result;
}

export async function handlePayoutWebhook(
  schoolId: string,
  payoutId: string,
  status: string,
  failureReason?: string,
) {
  await applyRazorpayPayoutStatus(schoolId, payoutId, status, failureReason);
}
