import { prisma } from "@/lib/db/prisma";
import { enqueueNotification } from "@/lib/notifications";
import { generatePayrollRunCore } from "@/lib/payroll/generate";
import {
  formatMonthLabel,
  getLocalDateParts,
  getMonthPeriodBounds,
  getPreviousCalendarMonth,
  isFirstDayOfMonth,
  isPayrollRunDay,
} from "@/lib/payroll/period";
import { collectPayrollReadiness } from "@/lib/payroll/readiness";
import { getSchoolAdminUserIds, runAutoMonthlyPayroll } from "@/lib/payroll/run-monthly";

export async function processPayrollJobs(now = new Date()) {
  const schools = await prisma.school.findMany({
    where: { status: "ACTIVE" },
    include: { payoutConfig: true },
  });

  for (const school of schools) {
    const timezone = school.timezone || "Asia/Kolkata";
    const payoutConfig = school.payoutConfig;
    const adminIds = await getSchoolAdminUserIds(school.id);
    if (adminIds.length === 0) continue;

    const systemActorId = adminIds[0];
    const prevMonth = getPreviousCalendarMonth(now);
    const currentMonth = getLocalDateParts(now, timezone);

    if (payoutConfig?.autoPayoutEnabled && payoutConfig.isEnabled && isPayrollRunDay(now, timezone, payoutConfig.payrollRunDay)) {
      const monthLabel = formatMonthLabel(currentMonth.year, currentMonth.month);
      const readiness = await collectPayrollReadiness(school.id);
      if (!readiness.readyForPayout) {
        const names = readiness.incompleteEmployees.slice(0, 3).map((e) => e.name).join(", ");
        for (const adminId of adminIds) {
          await enqueueNotification({
            schoolId: school.id,
            userId: adminId,
            title: "Automatic payroll skipped",
            body: `Payroll setup incomplete for ${monthLabel}. ${names || "Fix employee salary/bank details."}`,
            metadata: { type: "payroll_auto_skipped", month: monthLabel },
          });
        }
        continue;
      }

      try {
        await runAutoMonthlyPayroll(
          school.id,
          systemActorId,
          currentMonth.year,
          currentMonth.month,
          async ({ periodStart, periodEnd }) => {
            const run = await generatePayrollRunCore(
              school.id,
              systemActorId,
              new Date(periodStart),
              new Date(periodEnd),
            );
            return { payrollRunId: run.id };
          },
        );

        for (const adminId of adminIds) {
          await enqueueNotification({
            schoolId: school.id,
            userId: adminId,
            title: "Automatic payroll processed",
            body: `Salary payouts for ${monthLabel} have been initiated via RazorpayX.`,
            metadata: { type: "payroll_auto_completed", month: monthLabel },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Automatic payroll failed";
        for (const adminId of adminIds) {
          await enqueueNotification({
            schoolId: school.id,
            userId: adminId,
            title: "Automatic payroll failed",
            body: message,
            metadata: { type: "payroll_auto_failed" },
          });
        }
      }
    }

    if (!payoutConfig?.autoPayoutEnabled && isFirstDayOfMonth(now, timezone)) {
      const { periodStart, periodEnd } = getMonthPeriodBounds(prevMonth.year, prevMonth.month);
      const existingRun = await prisma.payrollRun.findFirst({
        where: {
          schoolId: school.id,
          periodStart,
          periodEnd,
          status: "COMPLETED",
        },
      });
      if (existingRun) continue;

      const monthLabel = formatMonthLabel(prevMonth.year, prevMonth.month);
      for (const adminId of adminIds) {
        await enqueueNotification({
          schoolId: school.id,
          userId: adminId,
          title: "Monthly payroll due",
          body: `Generate and pay salaries for ${monthLabel}. Go to Payroll to review or start payout.`,
          metadata: { type: "payroll_manual_reminder", month: monthLabel },
        });
      }
    }
  }
}
