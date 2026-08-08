import type { Prisma } from "@prisma/client";

export type SalaryComponentMap = Record<string, number>;

export function parseSalaryComponents(value: Prisma.JsonValue): SalaryComponentMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: SalaryComponentMap = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "number") result[key] = val;
  }
  return result;
}

export function sumComponents(components: SalaryComponentMap): number {
  return Object.values(components).reduce((sum, v) => sum + v, 0);
}

export function calculateNetSalary(input: {
  baseSalary: number | Prisma.Decimal;
  allowances?: SalaryComponentMap;
  deductions?: SalaryComponentMap;
  unpaidLeaveDays?: number;
  dailyRate?: number;
}): { gross: number; net: number; deductions: SalaryComponentMap } {
  const base = Number(input.baseSalary);
  const allowances = input.allowances ?? {};
  const deductions = { ...(input.deductions ?? {}) };

  if (input.unpaidLeaveDays && input.dailyRate) {
    deductions.leave_deduction = input.unpaidLeaveDays * input.dailyRate;
  }

  const gross = base + sumComponents(allowances);
  const totalDeductions = sumComponents(deductions);
  const net = Math.max(0, gross - totalDeductions);

  return { gross, net, deductions };
}

export function getDailyRate(baseSalary: number, workingDaysPerMonth = 26): number {
  return baseSalary / workingDaysPerMonth;
}
