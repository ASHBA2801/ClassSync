import { prisma, withTenantContext } from "@/lib/db/prisma";
import { formatMonthLabel, getMonthPeriodBounds, getPreviousCalendarMonth } from "./period";

export interface IncompleteEmployee {
  id: string;
  employeeCode: string;
  name: string;
  issues: ("missing_salary" | "missing_bank" | "unverified_bank")[];
}

export interface PayrollReadiness {
  activeEmployeeCount: number;
  missingSalaryCount: number;
  missingBankCount: number;
  unverifiedBankCount: number;
  razorpayXConfigured: boolean;
  razorpayXEnabled: boolean;
  autoPayoutEnabled: boolean;
  previousMonth: {
    year: number;
    month: number;
    label: string;
    status: "none" | "draft" | "approved" | "processing" | "completed" | "failed";
    payrollRunId: string | null;
  };
  incompleteEmployees: IncompleteEmployee[];
  readyForPayout: boolean;
}

export async function collectPayrollReadiness(schoolId: string): Promise<PayrollReadiness> {
  const [payoutConfig, employees, prevPeriod] = await Promise.all([
    prisma.schoolPayoutConfig.findUnique({ where: { schoolId } }),
    withTenantContext(schoolId, async (tx) =>
      tx.employee.findMany({
        where: { schoolId, employmentStatus: "ACTIVE" },
        include: {
          user: { select: { name: true } },
          salaries: { where: { effectiveTo: null }, take: 1 },
          bankAccounts: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    ),
    Promise.resolve(getPreviousCalendarMonth()),
  ]);

  const incompleteEmployees: IncompleteEmployee[] = [];
  let missingSalaryCount = 0;
  let missingBankCount = 0;
  let unverifiedBankCount = 0;

  for (const employee of employees) {
    const issues: IncompleteEmployee["issues"] = [];
    if (employee.salaries.length === 0) {
      missingSalaryCount++;
      issues.push("missing_salary");
    }
    const bank = employee.bankAccounts[0];
    if (!bank) {
      missingBankCount++;
      issues.push("missing_bank");
    } else if (!bank.isVerified) {
      unverifiedBankCount++;
      issues.push("unverified_bank");
    }
    if (issues.length > 0) {
      incompleteEmployees.push({
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.user.name,
        issues,
      });
    }
  }

  const { periodStart, periodEnd } = getMonthPeriodBounds(prevPeriod.year, prevPeriod.month);
  const previousRun = await withTenantContext(schoolId, async (tx) =>
    tx.payrollRun.findFirst({
      where: {
        schoolId,
        periodStart,
        periodEnd,
        status: { not: "FAILED" },
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  const razorpayXConfigured = Boolean(
    payoutConfig?.apiKeyEncrypted && payoutConfig.apiSecretEncrypted && payoutConfig.razorpayXAccountNumber,
  );

  return {
    activeEmployeeCount: employees.length,
    missingSalaryCount,
    missingBankCount,
    unverifiedBankCount,
    razorpayXConfigured,
    razorpayXEnabled: payoutConfig?.isEnabled ?? false,
    autoPayoutEnabled: payoutConfig?.autoPayoutEnabled ?? false,
    previousMonth: {
      year: prevPeriod.year,
      month: prevPeriod.month,
      label: formatMonthLabel(prevPeriod.year, prevPeriod.month),
      status: previousRun
        ? (previousRun.status.toLowerCase() as PayrollReadiness["previousMonth"]["status"])
        : "none",
      payrollRunId: previousRun?.id ?? null,
    },
    incompleteEmployees,
    readyForPayout:
      missingSalaryCount === 0 &&
      missingBankCount === 0 &&
      unverifiedBankCount === 0 &&
      razorpayXConfigured &&
      (payoutConfig?.isEnabled ?? false),
  };
}

export async function validatePayrollRunPayoutReadiness(
  schoolId: string,
  payrollRunId: string,
): Promise<{ ok: true } | { ok: false; message: string; incompleteEmployees: IncompleteEmployee[] }> {
  const readiness = await collectPayrollReadiness(schoolId);
  if (!readiness.razorpayXConfigured || !readiness.razorpayXEnabled) {
    return {
      ok: false,
      message: "RazorpayX is not configured or enabled. Go to Admin → Settings to set up salary payouts.",
      incompleteEmployees: readiness.incompleteEmployees,
    };
  }
  if (readiness.incompleteEmployees.length > 0) {
    const names = readiness.incompleteEmployees.slice(0, 5).map((e) => e.name).join(", ");
    return {
      ok: false,
      message: `Payroll setup incomplete for: ${names}${readiness.incompleteEmployees.length > 5 ? "…" : ""}`,
      incompleteEmployees: readiness.incompleteEmployees,
    };
  }

  const run = await withTenantContext(schoolId, async (tx) =>
    tx.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: {
        payouts: {
          include: {
            employee: {
              include: {
                user: { select: { name: true } },
                bankAccounts: { orderBy: { createdAt: "desc" }, take: 1 },
              },
            },
          },
        },
      },
    }),
  );
  if (!run) {
    return { ok: false, message: "Payroll run not found", incompleteEmployees: [] };
  }

  const runIssues: IncompleteEmployee[] = [];
  for (const payout of run.payouts) {
    const bank = payout.employee.bankAccounts[0];
    if (!bank?.isVerified) {
      runIssues.push({
        id: payout.employeeId,
        employeeCode: payout.employee.employeeCode,
        name: payout.employee.user.name,
        issues: bank ? ["unverified_bank"] : ["missing_bank"],
      });
    }
  }
  if (runIssues.length > 0) {
    return {
      ok: false,
      message: "Some employees in this payroll run have unverified or missing bank accounts.",
      incompleteEmployees: runIssues,
    };
  }

  return { ok: true };
}
