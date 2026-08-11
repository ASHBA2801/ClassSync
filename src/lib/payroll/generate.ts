import { randomUUID } from "crypto";
import { withTenantContext } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { calculateNetSalary, parseSalaryComponents } from "@/lib/employees/salary";
import { computeEmployeeAbsenceDeduction } from "@/lib/payroll/absence-deduction";

export async function generatePayrollRunCore(
  schoolId: string,
  actorId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const run = await withTenantContext(schoolId, async (tx) => {
    const existing = await tx.payrollRun.findFirst({
      where: { schoolId, periodStart, periodEnd, status: { not: "FAILED" } },
    });
    if (existing) throw new Error("Payroll run already exists for this period");

    const employees = await tx.employee.findMany({
      where: { schoolId, employmentStatus: "ACTIVE" },
      include: {
        salaries: {
          where: {
            effectiveFrom: { lte: periodEnd },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
          },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
        user: true,
      },
    });

    const payrollRun = await tx.payrollRun.create({
      data: {
        schoolId,
        periodStart,
        periodEnd,
        status: "DRAFT",
      },
    });

    let totalAmount = 0;
    let employeeCount = 0;

    for (const employee of employees) {
      const salary = employee.salaries[0];
      if (!salary) continue;

      const payoutId = randomUUID();

      const baseSalary = Number(salary.baseSalary);
      const allowances = parseSalaryComponents(salary.allowances);
      const baseDeductions = parseSalaryComponents(salary.deductions);
      const { unpaidLeaveDays, dailyRate } = await computeEmployeeAbsenceDeduction(
        tx,
        schoolId,
        {
          id: employee.id,
          userId: employee.userId,
          jobType: employee.jobType,
        },
        periodStart,
        periodEnd,
        baseSalary,
      );
      const { gross, net, deductions } = calculateNetSalary({
        baseSalary,
        allowances,
        deductions: baseDeductions,
        unpaidLeaveDays,
        dailyRate,
      });

      await tx.salaryPayout.create({
        data: {
          id: payoutId,
          schoolId,
          payrollRunId: payrollRun.id,
          employeeId: employee.id,
          grossAmount: gross,
          netAmount: net,
          deductions,
          status: "PENDING",
          idempotencyKey: payoutId,
        },
      });

      totalAmount += net;
      employeeCount++;
    }

    return tx.payrollRun.update({
      where: { id: payrollRun.id },
      data: { totalAmount, employeeCount },
    });
  });

  await createAuditLog({
    actorId,
    action: "payroll.generate",
    schoolId,
    entityType: "PayrollRun",
    entityId: run.id,
  });

  return run;
}
