import { describe, it, expect } from "vitest";
import {
  evaluateReadinessFromData,
  getEffectiveConstraint,
  parseTimeToMinutes,
  validateConstraintSanity,
  validatePeriodTimings,
  type ReadinessInput,
} from "@/lib/scheduler/readiness";

const baseInput: ReadinessInput = {
  grades: [
    {
      id: "g1",
      name: "Grade 10",
      classSections: [{ id: "s1", name: "Grade 10 - A" }],
      subjects: [{ id: "sub1", name: "Math", periodsPerWeek: 5 }],
    },
  ],
  periods: [
    { periodNo: 1, startTime: "08:00", endTime: "09:00" },
    { periodNo: 2, startTime: "09:00", endTime: "10:00" },
  ],
  assignments: [{ teacherId: "t1", classSectionId: "s1", subjectId: "sub1" }],
  constraints: [
    {
      teacherId: null,
      minFreePerDay: 0,
      maxFreePerDay: 2,
      minFreePerWeek: 1,
      maxFreePerWeek: 10,
    },
  ],
  daysPerWeek: 5,
};

describe("scheduler readiness", () => {
  it("passes when all setup is complete", () => {
    const result = evaluateReadinessFromData(baseInput);
    expect(result.isReady).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when no grades exist", () => {
    const result = evaluateReadinessFromData({ ...baseInput, grades: [] });
    expect(result.isReady).toBe(false);
    expect(result.checks.find((c) => c.step === "grades")?.passed).toBe(false);
  });

  it("fails when grade has no sections", () => {
    const result = evaluateReadinessFromData({
      ...baseInput,
      grades: [{ ...baseInput.grades[0], classSections: [] }],
    });
    expect(result.checks.find((c) => c.step === "sections")?.passed).toBe(false);
  });

  it("fails when periods are missing", () => {
    const result = evaluateReadinessFromData({ ...baseInput, periods: [] });
    expect(result.checks.find((c) => c.step === "periods")?.passed).toBe(false);
  });

  it("fails when period numbering has gaps", () => {
    const checks = validatePeriodTimings([
      { periodNo: 1, startTime: "08:00", endTime: "09:00" },
      { periodNo: 3, startTime: "10:00", endTime: "11:00" },
    ]);
    expect(checks[0].passed).toBe(false);
    expect(checks[0].message).toContain("Missing period 2");
  });

  it("fails when period times are invalid", () => {
    const checks = validatePeriodTimings([
      { periodNo: 1, startTime: "09:00", endTime: "08:00" },
    ]);
    expect(checks[0].passed).toBe(false);
  });

  it("fails when subjects are not configured", () => {
    const result = evaluateReadinessFromData({
      ...baseInput,
      grades: [{ ...baseInput.grades[0], subjects: [] }],
    });
    expect(result.checks.find((c) => c.step === "subjects")?.passed).toBe(false);
  });

  it("fails when teacher assignments are missing", () => {
    const result = evaluateReadinessFromData({ ...baseInput, assignments: [] });
    expect(result.checks.find((c) => c.step === "assignments")?.passed).toBe(false);
    expect(result.summary.unassignedSlots.length).toBe(1);
  });

  it("fails when global constraint is missing", () => {
    const result = evaluateReadinessFromData({ ...baseInput, constraints: [] });
    expect(result.checks.find((c) => c.step === "constraints")?.passed).toBe(false);
  });

  it("resolves teacher override over global constraint", () => {
    const effective = getEffectiveConstraint("t1", [
      {
        teacherId: null,
        minFreePerDay: 0,
        maxFreePerDay: 3,
        minFreePerWeek: 1,
        maxFreePerWeek: 10,
      },
      {
        teacherId: "t1",
        minFreePerDay: 1,
        maxFreePerDay: 2,
        minFreePerWeek: 2,
        maxFreePerWeek: 8,
      },
    ]);
    expect(effective?.minFreePerDay).toBe(1);
    expect(effective?.maxFreePerWeek).toBe(8);
  });

  it("falls back to global constraint when no override", () => {
    const effective = getEffectiveConstraint("t2", baseInput.constraints);
    expect(effective?.minFreePerWeek).toBe(1);
  });

  it("validates constraint sanity", () => {
    expect(
      validateConstraintSanity(
        { minFreePerDay: 2, maxFreePerDay: 1, minFreePerWeek: 1, maxFreePerWeek: 5 },
        8,
      ),
    ).toContain("day");
  });

  it("parses time strings", () => {
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("invalid")).toBeNull();
  });

  it("fails capacity check when demand exceeds supply", () => {
    const result = evaluateReadinessFromData({
      ...baseInput,
      grades: [
        {
          ...baseInput.grades[0],
          subjects: [{ id: "sub1", name: "Math", periodsPerWeek: 50 }],
        },
      ],
      periods: [{ periodNo: 1, startTime: "08:00", endTime: "09:00" }],
    });
    expect(result.checks.find((c) => c.step === "capacity")?.passed).toBe(false);
  });
});
