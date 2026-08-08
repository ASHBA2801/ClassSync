import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  maskAccountNumber,
  maskIfsc,
  validateIfsc,
  validateAccountNumber,
} from "@/lib/employees/bank";
import { calculateNetSalary, getDailyRate } from "@/lib/employees/salary";
import { getMonthPeriodBounds, getPreviousCalendarMonth } from "@/lib/payroll/period";

describe("employee bank utilities", () => {
  it("validates IFSC format", () => {
    expect(validateIfsc("HDFC0001234")).toBe(true);
    expect(validateIfsc("invalid")).toBe(false);
  });

  it("validates account number length", () => {
    expect(validateAccountNumber("123456789")).toBe(true);
    expect(validateAccountNumber("123")).toBe(false);
  });

  it("masks account number", () => {
    expect(maskAccountNumber("1234567890")).toBe("****7890");
  });

  it("masks IFSC", () => {
    expect(maskIfsc("HDFC0001234")).toMatch(/^HDFC/);
  });
});

describe("salary calculation", () => {
  it("calculates net salary with deductions", () => {
    const result = calculateNetSalary({
      baseSalary: 30000,
      allowances: { hra: 5000 },
      deductions: { pf: 1800 },
    });
    expect(result.gross).toBe(35000);
    expect(result.net).toBe(33200);
  });

  it("deducts unpaid leave days", () => {
    const dailyRate = getDailyRate(26000, 22);
    const result = calculateNetSalary({
      baseSalary: 26000,
      unpaidLeaveDays: 2,
      dailyRate,
    });
    expect(result.net).toBeLessThan(26000);
    expect(result.deductions.leave_deduction).toBeCloseTo((26000 / 22) * 2, 2);
  });
});

describe("payroll period helpers", () => {
  it("computes month period bounds", () => {
    const { periodStart, periodEnd } = getMonthPeriodBounds(2026, 2);
    expect(periodStart.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(periodEnd.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("returns previous calendar month", () => {
    expect(getPreviousCalendarMonth(new Date("2026-03-15T00:00:00Z"))).toEqual({ year: 2026, month: 2 });
    expect(getPreviousCalendarMonth(new Date("2026-01-05T00:00:00Z"))).toEqual({ year: 2025, month: 12 });
  });
});

describe("bank encryption roundtrip", () => {
  beforeAll(() => {
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = "a".repeat(64);
    }
  });

  it("encrypts and decrypts bank fields", () => {
    const plain = "9876543210";
    const encrypted = encrypt(plain);
    expect(decrypt(encrypted)).toBe(plain);
  });
});
