import { describe, it, expect } from "vitest";
import {
  buildMonthCalendar,
  computeDeductibleAbsentDays,
  parseIsoDate,
  resolveDayWorkingStatus,
  resolveWorkingDayKeys,
  subtractOdDates,
} from "@/lib/calendar/working-days";

describe("working day calendar helpers", () => {
  const weekdayTemplate = [0, 1, 2, 3, 4];

  it("falls back to weekday template when no override exists", () => {
    const monday = parseIsoDate("2026-08-03");
    const saturday = parseIsoDate("2026-08-08");

    expect(resolveDayWorkingStatus(monday, weekdayTemplate, new Map()).isWorkingDay).toBe(true);
    expect(resolveDayWorkingStatus(saturday, weekdayTemplate, new Map()).isWorkingDay).toBe(false);
  });

  it("uses calendar override when present", () => {
    const saturday = parseIsoDate("2026-08-08");
    const overrides = new Map([["2026-08-08", { isWorkingDay: true, note: null }]]);

    expect(resolveDayWorkingStatus(saturday, weekdayTemplate, overrides).isWorkingDay).toBe(true);
    expect(resolveDayWorkingStatus(saturday, weekdayTemplate, overrides).isOverride).toBe(true);
  });

  it("resolves working day keys for a period", () => {
    const keys = resolveWorkingDayKeys(
      parseIsoDate("2026-08-03"),
      parseIsoDate("2026-08-09"),
      weekdayTemplate,
      new Map(),
    );

    expect(keys).toEqual(["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"]);
  });

  it("builds month calendar entries", () => {
    const days = buildMonthCalendar(2026, 8, weekdayTemplate, new Map());
    expect(days.length).toBe(31);
    expect(days[0]?.date).toBe("2026-08-01");
  });
});

describe("OD exclusion", () => {
  it("removes absent days covered by approved OD leave", () => {
    const filtered = subtractOdDates(["2026-08-04", "2026-08-05", "2026-08-06"], [
      { startDate: parseIsoDate("2026-08-05"), endDate: parseIsoDate("2026-08-05") },
    ]);

    expect(filtered).toEqual(["2026-08-04", "2026-08-06"]);
  });
});

describe("minimum leave allowance math", () => {
  const periodStart = parseIsoDate("2026-08-01");
  const periodEnd = parseIsoDate("2026-08-31");

  it("deducts only exceeded absences for monthly allowance", () => {
    const deductDays = computeDeductibleAbsentDays({
      absentKeysInPeriod: ["2026-08-04", "2026-08-05", "2026-08-06"],
      minimumLeaves: 2,
      leaveAllowancePeriod: "MONTH",
      periodStart,
      periodEnd,
    });

    expect(deductDays).toBe(1);
  });

  it("charges only new yearly excess in the payroll month", () => {
    const deductDays = computeDeductibleAbsentDays({
      absentKeysInPeriod: ["2026-08-20", "2026-08-21"],
      minimumLeaves: 3,
      leaveAllowancePeriod: "YEAR",
      periodStart,
      periodEnd,
      ytdAbsentKeys: [
        "2026-01-05",
        "2026-02-04",
        "2026-03-03",
        "2026-08-20",
        "2026-08-21",
      ],
    });

    expect(deductDays).toBe(2);
  });

  it("does not double-charge yearly excess across months", () => {
    const janStart = parseIsoDate("2026-01-01");
    const janEnd = parseIsoDate("2026-01-31");
    const febStart = parseIsoDate("2026-02-01");
    const febEnd = parseIsoDate("2026-02-28");
    const ytdKeys = ["2026-01-05", "2026-01-06", "2026-01-07", "2026-02-04", "2026-02-05"];

    const janDeduct = computeDeductibleAbsentDays({
      absentKeysInPeriod: ["2026-01-05", "2026-01-06", "2026-01-07"],
      minimumLeaves: 2,
      leaveAllowancePeriod: "YEAR",
      periodStart: janStart,
      periodEnd: janEnd,
      ytdAbsentKeys: ["2026-01-05", "2026-01-06", "2026-01-07"],
    });

    const febDeduct = computeDeductibleAbsentDays({
      absentKeysInPeriod: ["2026-02-04", "2026-02-05"],
      minimumLeaves: 2,
      leaveAllowancePeriod: "YEAR",
      periodStart: febStart,
      periodEnd: febEnd,
      ytdAbsentKeys: ytdKeys,
    });

    expect(janDeduct).toBe(1);
    expect(febDeduct).toBe(2);
    expect(janDeduct + febDeduct).toBe(3);
  });
});
