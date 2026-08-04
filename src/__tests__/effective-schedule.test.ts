import { describe, it, expect } from "vitest";
import {
  mergeBaseSlotsWithAlterations,
  dateToDayOfWeek,
} from "@/lib/scheduler/smart-scheduler";
import { validateSlotConflict } from "@/lib/scheduler/solver";

describe("effective schedule merge", () => {
  it("applies multiple alterations on same day", () => {
    const base = [
      { id: "1", dayOfWeek: 0, periodNo: 1, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
      { id: "2", dayOfWeek: 0, periodNo: 2, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
      { id: "3", dayOfWeek: 0, periodNo: 1, teacherId: "t3", classSectionId: "c2", subjectId: "s2" },
    ];
    const alts = [
      { id: "a1", periodNo: 1, classSectionId: "c1", originalTeacherId: "t1", substituteTeacherId: "t2" },
      { id: "a2", periodNo: 2, classSectionId: "c1", originalTeacherId: "t1", substituteTeacherId: "t4" },
    ];
    const merged = mergeBaseSlotsWithAlterations(base, alts);
    expect(merged.filter((s) => s.isAltered)).toHaveLength(2);
    expect(merged[0].effectiveTeacherId).toBe("t2");
    expect(merged[1].effectiveTeacherId).toBe("t4");
    expect(merged[2].effectiveTeacherId).toBe("t3");
  });

  it("validates no conflict when substitutes differ", () => {
    const slots = [
      { dayOfWeek: 0, periodNo: 1, teacherId: "t2", classSectionId: "c1", subjectId: "s1" },
      { dayOfWeek: 0, periodNo: 1, teacherId: "t3", classSectionId: "c2", subjectId: "s2" },
    ];
    expect(validateSlotConflict(slots, slots[1], 1)).toBeNull();
  });

  it("maps calendar date to schedule dayOfWeek", () => {
    expect(dateToDayOfWeek(new Date("2026-08-05"))).toBe(2); // Wednesday
  });
});
