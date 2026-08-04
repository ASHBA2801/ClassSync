import { describe, it, expect } from "vitest";
import {
  analyzeScheduleFeasibility,
  formatAssignmentError,
  formatDayName,
  summarizeSchedulerErrors,
} from "@/lib/scheduler/errors";
import type { SchedulerInput } from "@/lib/scheduler/solver";

const labels = {
  teachers: { t1: "Ms. Sharma", t2: "Mr. Patel" },
  sections: { s1: "Grade 8 - A" },
  subjects: { sub1: "Mathematics" },
};

const baseInput: SchedulerInput = {
  daysPerWeek: 5,
  workingDays: [0, 1, 2, 3, 4],
  periodsPerDay: 8,
  assignments: [
    {
      teacherId: "t1",
      classSectionId: "s1",
      subjectId: "sub1",
      periodsPerWeek: 8,
    },
  ],
  constraints: [
    {
      minFreePerDay: 0,
      maxFreePerDay: 2,
      minFreePerWeek: 0,
      maxFreePerWeek: 5,
    },
  ],
};

describe("scheduler errors", () => {
  it("formats day names", () => {
    expect(formatDayName(0)).toBe("Monday");
    expect(formatDayName(4)).toBe("Friday");
  });

  it("formats assignment errors with human names", () => {
    const msg = formatAssignmentError(baseInput.assignments[0], 0, labels);
    expect(msg).toContain("Grade 8 - A");
    expect(msg).toContain("Mathematics");
    expect(msg).toContain("Ms. Sharma");
    expect(msg).not.toContain("t1");
  });

  it("detects impossible global free-period rules", () => {
    const errors = analyzeScheduleFeasibility(baseInput, labels);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Global rules require every teacher");
    expect(errors[0]).toContain("35 periods/week");
    expect(errors[0]).toContain("Max Free / Week");
  });

  it("summarizes long error lists", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Error ${i + 1}`);
    const summary = summarizeSchedulerErrors(many, 8);
    expect(summary).toHaveLength(9);
    expect(summary[8]).toContain("4 more similar");
  });
});
