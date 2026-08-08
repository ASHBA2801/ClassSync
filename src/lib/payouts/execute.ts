import { prisma, withTenantContext } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { initiateEmployeePayout } from "./razorpayx";

export async function executePayrollPayouts(
  schoolId: string,
  payrollRunId: string,
  actorId: string,
) {
  return withTenantContext(schoolId, async (tx) => {
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
    const useRazorpay = config?.isEnabled ?? false;

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const payout of run.payouts) {
      try {
        if (Number(payout.netAmount) <= 0) {
          await tx.salaryPayout.update({
            where: { id: payout.id },
            data: { status: "SUCCESS", paidAt: new Date() },
          });
          successCount++;
          continue;
        }

        if (useRazorpay) {
          await tx.salaryPayout.update({
            where: { id: payout.id },
            data: { status: "PROCESSING" },
          });

          const result = await initiateEmployeePayout({
            schoolId,
            employeeId: payout.employeeId,
            amount: Number(payout.netAmount),
            idempotencyKey: payout.idempotencyKey,
            narration: `Salary ${run.periodStart.toISOString().slice(0, 7)}`,
          });

          await tx.salaryPayout.update({
            where: { id: payout.id },
            data: {
              razorpayPayoutId: result.payoutId,
              status: result.status === "processed" ? "SUCCESS" : "PROCESSING",
              paidAt: result.status === "processed" ? new Date() : null,
            },
          });
        } else {
          await tx.salaryPayout.update({
            where: { id: payout.id },
            data: { status: "PROCESSING" },
          });
          errors.push(`Payout ${payout.id}: RazorpayX not configured — use manual mark paid`);
          failCount++;
          continue;
        }

        successCount++;
      } catch (err) {
        failCount++;
        const message = err instanceof Error ? err.message : "Payout failed";
        errors.push(message);
        await tx.salaryPayout.update({
          where: { id: payout.id },
          data: { status: "FAILED", failureReason: message },
        });
      }
    }

    const finalStatus = failCount === 0 ? "COMPLETED" : successCount > 0 ? "COMPLETED" : "FAILED";
    await tx.payrollRun.update({
      where: { id: payrollRunId },
      data: { status: finalStatus },
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
  });
}

export async function handlePayoutWebhook(
  schoolId: string,
  payoutId: string,
  status: string,
  failureReason?: string,
) {
  await withTenantContext(schoolId, async (tx) => {
    const payout = await tx.salaryPayout.findFirst({
      where: { razorpayPayoutId: payoutId, schoolId },
    });
    if (!payout) return;

    const mappedStatus =
      status === "processed" ? "SUCCESS" :
      status === "reversed" ? "REVERSED" :
      status === "failed" ? "FAILED" :
      "PROCESSING";

    await tx.salaryPayout.update({
      where: { id: payout.id },
      data: {
        status: mappedStatus,
        failureReason: failureReason ?? null,
        paidAt: mappedStatus === "SUCCESS" ? new Date() : payout.paidAt,
      },
    });
  });
}
