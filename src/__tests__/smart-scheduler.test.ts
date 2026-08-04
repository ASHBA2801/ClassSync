import { describe, it, expect } from "vitest";
import {
  dateToDayOfWeek,
  eachDateInRange,
  startOfDay,
  formatDateKey,
  pickBestCandidate,
  mergeBaseSlotsWithAlterations,
  buildSubstituteTiers,
} from "@/lib/scheduler/smart-scheduler";
import { validateSlotConflict } from "@/lib/scheduler/solver";

describe("smart-scheduler utilities", () => {
  it("converts Sunday to day 6 and Monday to day 0", () => {
    expect(dateToDayOfWeek(new Date("2026-08-03"))).toBe(0); // Monday
    expect(dateToDayOfWeek(new Date("2026-08-09"))).toBe(6); // Sunday
  });

  it("iterates inclusive date ranges", () => {
    const dates = eachDateInRange(new Date(2026, 7, 1), new Date(2026, 7, 3));
    expect(dates).toHaveLength(3);
    expect(formatDateKey(dates[0])).toBe("2026-08-01");
    expect(formatDateKey(dates[2])).toBe("2026-08-03");
  });

  it("normalizes to start of day", () => {
    const d = startOfDay(new Date("2026-08-04T15:30:00"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe("pickBestCandidate", () => {
  it("picks teacher with lowest substitute count", () => {
    const stats = new Map([
      ["t1", 5],
      ["t2", 1],
      ["t3", 3],
    ]);
    expect(pickBestCandidate(["t1", "t3", "t2"], stats)).toBe("t2");
  });

  it("returns null for empty candidates", () => {
    expect(pickBestCandidate([], new Map())).toBeNull();
  });
});

describe("buildSubstituteTiers", () => {
  const assignments = [
    { teacherId: "t1", subjectId: "math", classSectionId: "1a", gradeId: "g1" },
    { teacherId: "t2", subjectId: "math", classSectionId: "1b", gradeId: "g1" },
    { teacherId: "t3", subjectId: "eng", classSectionId: "1a", gradeId: "g1" },
    { teacherId: "t4", subjectId: "sci", classSectionId: "2a", gradeId: "g1" },
    { teacherId: "t5", subjectId: "hist", classSectionId: "3a", gradeId: "g2" },
  ];

  it("places same-subject other-section teacher in tier 1", () => {
    const tiers = buildSubstituteTiers(assignments, {
      subjectId: "math",
      classSectionId: "1a",
      gradeId: "g1",
      absentTeacherId: "t1",
    });
    expect(tiers.tier1).toEqual(["t2"]);
  });

  it("places same-section other-subject teacher in tier 2", () => {
    const tiers = buildSubstituteTiers(assignments, {
      subjectId: "math",
      classSectionId: "1a",
      gradeId: "g1",
      absentTeacherId: "t1",
    });
    expect(tiers.tier2).toEqual(["t3"]);
  });

  it("places same-grade teacher in tier 3", () => {
    const tiers = buildSubstituteTiers(assignments, {
      subjectId: "math",
      classSectionId: "1a",
      gradeId: "g1",
      absentTeacherId: "t1",
    });
    expect(tiers.tier3).toEqual(["t4"]);
  });
});

describe("mergeBaseSlotsWithAlterations", () => {
  it("overrides teacher when alteration exists", () => {
    const base = [
      {
        id: "s1",
        dayOfWeek: 0,
        periodNo: 1,
        teacherId: "t1",
        classSectionId: "c1",
        subjectId: "sub1",
      },
    ];
    const alts = [
      {
        id: "a1",
        periodNo: 1,
        classSectionId: "c1",
        originalTeacherId: "t1",
        substituteTeacherId: "t2",
      },
    ];
    const merged = mergeBaseSlotsWithAlterations(base, alts);
    expect(merged[0].isAltered).toBe(true);
    expect(merged[0].effectiveTeacherId).toBe("t2");
  });

  it("keeps base teacher when no alteration", () => {
    const base = [
      {
        id: "s1",
        dayOfWeek: 0,
        periodNo: 2,
        teacherId: "t1",
        classSectionId: "c1",
        subjectId: "sub1",
      },
    ];
    const merged = mergeBaseSlotsWithAlterations(base, []);
    expect(merged[0].isAltered).toBe(false);
    expect(merged[0].effectiveTeacherId).toBe("t1");
  });
});

describe("effective schedule conflict detection", () => {
  it("detects teacher double-booking in merged effective slots", () => {
    const effective = [
      { dayOfWeek: 0, periodNo: 1, teacherId: "t2", classSectionId: "c1", subjectId: "s1" },
      { dayOfWeek: 0, periodNo: 1, teacherId: "t2", classSectionId: "c2", subjectId: "s2" },
    ];
    const conflict = validateSlotConflict(effective, effective[1], 1);
    expect(conflict).toBe("Teacher is already booked in this period");
  });
});
