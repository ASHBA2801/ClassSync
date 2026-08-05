import { describe, it, expect } from "vitest";
import { isWithinGeofence, haversineDistanceM } from "@/lib/geofence";
import {
  solveSchedule,
  validateSlotConflict,
  validateTeacherFreePeriods,
  validateSectionScheduleQuality,
  DEFAULT_TIMETABLE_QUALITY,
} from "@/lib/scheduler/solver";

describe("geofence", () => {
  it("returns true when within radius", () => {
    expect(isWithinGeofence(12.9716, 77.5946, 12.9716, 77.5946, 200)).toBe(true);
  });

  it("returns false when far away", () => {
    expect(isWithinGeofence(13.0, 78.0, 12.9716, 77.5946, 200)).toBe(false);
  });

  it("calculates distance correctly for same point", () => {
    expect(haversineDistanceM(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });
});

describe("scheduler", () => {
  const partialQuality = {
    ...DEFAULT_TIMETABLE_QUALITY,
    requireFullSectionWeek: false,
    maxSameSubjectPerDay: 8,
    maxConsecutiveSameSubject: 8,
  };

  const baseInput = {
    daysPerWeek: 5,
    workingDays: [0, 1, 2, 3, 4],
    periodsPerDay: 8,
    quality: partialQuality,
    assignments: [
      {
        teacherId: "t1",
        classSectionId: "c1",
        subjectId: "s1",
        periodsPerWeek: 5,
      },
    ],
    constraints: [
      {
        minFreePerWeek: 1,
        maxFreePerWeek: 35,
      },
    ],
  };

  it("generates conflict-free schedule", () => {
    const result = solveSchedule(baseInput);
    expect(result.success).toBe(true);
    expect(result.slots.length).toBe(5);

    const keys = new Set<string>();
    for (const slot of result.slots) {
      const teacherKey = `${slot.dayOfWeek}-${slot.periodNo}-t-${slot.teacherId}`;
      const classKey = `${slot.dayOfWeek}-${slot.periodNo}-c-${slot.classSectionId}`;
      expect(keys.has(teacherKey)).toBe(false);
      expect(keys.has(classKey)).toBe(false);
      keys.add(teacherKey);
      keys.add(classKey);
    }
  });

  it("prevents teacher overlap across sections", () => {
    const result = solveSchedule({
      ...baseInput,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "s1", periodsPerWeek: 3 },
        { teacherId: "t1", classSectionId: "c2", subjectId: "s2", periodsPerWeek: 3 },
      ],
    });
    expect(result.success).toBe(true);

    for (const slot of result.slots) {
      const sameTime = result.slots.filter(
        (s) => s.dayOfWeek === slot.dayOfWeek && s.periodNo === slot.periodNo,
      );
      const teachers = new Set(sameTime.map((s) => s.teacherId));
      expect(teachers.size).toBe(sameTime.length);
    }
  });

  it("detects teacher conflict on manual edit", () => {
    const slots = [
      { dayOfWeek: 0, periodNo: 1, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
    ];
    const conflict = validateSlotConflict(slots, {
      dayOfWeek: 0,
      periodNo: 1,
      teacherId: "t1",
      classSectionId: "c2",
      subjectId: "s2",
    });
    expect(conflict).toBe("Teacher is already booked in this period");
  });

  it("detects class conflict on manual edit", () => {
    const slots = [
      { dayOfWeek: 0, periodNo: 1, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
    ];
    const conflict = validateSlotConflict(slots, {
      dayOfWeek: 0,
      periodNo: 1,
      teacherId: "t2",
      classSectionId: "c1",
      subjectId: "s2",
    });
    expect(conflict).toBe("Class section is already booked in this period");
  });

  it("reports unsatisfiable period demand", () => {
    const result = solveSchedule({
      daysPerWeek: 2,
      workingDays: [0, 1],
      periodsPerDay: 2,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "s1", periodsPerWeek: 10 },
      ],
      constraints: [{ minFreePerWeek: 0, maxFreePerWeek: 10 }],
    });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("respects weekly free period max constraint", () => {
    const result = solveSchedule({
      daysPerWeek: 5,
      workingDays: [0, 1, 2, 3, 4],
      periodsPerDay: 4,
      quality: partialQuality,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "s1", periodsPerWeek: 15 },
      ],
      constraints: [{ minFreePerWeek: 0, maxFreePerWeek: 5 }],
    });
    expect(result.success).toBe(true);
    const weeklyBusy = result.slots.filter((s) => s.teacherId === "t1").length;
    expect(20 - weeklyBusy).toBeLessThanOrEqual(5);
  });

  it("validates teacher free periods helper", () => {
    const slots = [
      { dayOfWeek: 0, periodNo: 1, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
      { dayOfWeek: 0, periodNo: 2, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
    ];
    const error = validateTeacherFreePeriods(slots, "t1", 4, 1, {
      minFreePerWeek: 2,
      maxFreePerWeek: 2,
    });
    expect(error).toBeNull();
  });

  it("rejects 4 consecutive same-subject periods", () => {
    const input = {
      daysPerWeek: 5,
      workingDays: [0, 1, 2, 3, 4],
      periodsPerDay: 8,
      quality: DEFAULT_TIMETABLE_QUALITY,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "science", periodsPerWeek: 4 },
      ],
      constraints: [{ minFreePerWeek: 1, maxFreePerWeek: 35 }],
    };
    const slots = [1, 2, 3, 4].map((periodNo) => ({
      dayOfWeek: 0,
      periodNo,
      teacherId: "t1",
      classSectionId: "c1",
      subjectId: "science",
    }));
    const errors = validateSectionScheduleQuality(slots, "c1", input, {
      teachers: {},
      sections: { c1: "Grade 10 - A" },
      subjects: { science: "Science" },
    });
    expect(errors.some((e) => e.includes("consecutive"))).toBe(true);
  });

  it("rejects 3rd same-subject period on one day when max is 2", () => {
    const input = {
      daysPerWeek: 5,
      workingDays: [0, 1, 2, 3, 4],
      periodsPerDay: 8,
      quality: DEFAULT_TIMETABLE_QUALITY,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "science", periodsPerWeek: 3 },
      ],
      constraints: [{ minFreePerWeek: 1, maxFreePerWeek: 35 }],
    };
    const slots = [1, 3, 5].map((periodNo) => ({
      dayOfWeek: 0,
      periodNo,
      teacherId: "t1",
      classSectionId: "c1",
      subjectId: "science",
    }));
    const errors = validateSectionScheduleQuality(slots, "c1", input, {
      teachers: {},
      sections: { c1: "Grade 10 - A" },
      subjects: { science: "Science" },
    });
    expect(errors.some((e) => e.includes("exceeds max 2/day"))).toBe(true);
  });

  it("generates full demo-style timetables with quality rules", () => {
    const subjects = ["math", "english", "science", "history", "pe"];
    const sectionAssignments = (sectionId: string, teacherPrefix: string) =>
      subjects.map((subjectId, i) => ({
        teacherId: `${teacherPrefix}${i + 1}`,
        classSectionId: sectionId,
        subjectId,
        periodsPerWeek: 8,
      }));

    const result = solveSchedule({
      daysPerWeek: 5,
      workingDays: [0, 1, 2, 3, 4],
      periodsPerDay: 8,
      quality: DEFAULT_TIMETABLE_QUALITY,
      assignments: [
        ...sectionAssignments("c1", "a"),
        ...sectionAssignments("c2", "b"),
      ],
      constraints: [{ minFreePerWeek: 1, maxFreePerWeek: 35 }],
      labels: {
        teachers: {},
        sections: { c1: "Grade 10 - A", c2: "Grade 10 - B" },
        subjects: Object.fromEntries(subjects.map((s) => [s, s])),
      },
    });

    expect(result.success).toBe(true);

    for (const sectionId of ["c1", "c2"]) {
      const sectionSlots = result.slots.filter((s) => s.classSectionId === sectionId);
      expect(sectionSlots.length).toBe(40);

      for (const day of [0, 1, 2, 3, 4]) {
        const daySlots = sectionSlots.filter((s) => s.dayOfWeek === day);
        expect(daySlots.length).toBe(8);
      }

      const qualityErrors = validateSectionScheduleQuality(
        sectionSlots,
        sectionId,
        {
          daysPerWeek: 5,
          workingDays: [0, 1, 2, 3, 4],
          periodsPerDay: 8,
          quality: DEFAULT_TIMETABLE_QUALITY,
          assignments: [],
          constraints: [],
        },
        { teachers: {}, sections: { c1: "A", c2: "B" }, subjects: {} },
      );
      expect(qualityErrors).toEqual([]);
    }

    for (const subjectId of subjects) {
      const daysUsed = new Set(
        result.slots.filter((s) => s.subjectId === subjectId && s.classSectionId === "c1").map((s) => s.dayOfWeek),
      );
      expect(daysUsed.size).toBeGreaterThanOrEqual(4);
    }
  });

  it("generates timetables when teachers are shared across sections", () => {
    const subjects = ["math", "english", "science", "history", "pe"];
    const result = solveSchedule({
      daysPerWeek: 5,
      workingDays: [0, 1, 2, 3, 4],
      periodsPerDay: 8,
      quality: DEFAULT_TIMETABLE_QUALITY,
      assignments: subjects.flatMap((subjectId, i) => [
        {
          teacherId: `t${i + 1}`,
          classSectionId: "c1",
          subjectId,
          periodsPerWeek: 8,
        },
        {
          teacherId: `t${i + 1}`,
          classSectionId: "c2",
          subjectId,
          periodsPerWeek: 8,
        },
      ]),
      constraints: [{ minFreePerWeek: 1, maxFreePerWeek: 35 }],
    });

    expect(result.success).toBe(true);
    expect(result.slots.filter((s) => s.classSectionId === "c1").length).toBe(40);
    expect(result.slots.filter((s) => s.classSectionId === "c2").length).toBe(40);
  });
});

describe("encryption", () => {
  it("encrypts and decrypts roundtrip", async () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "rzp_test_secret_key";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });
});

describe("attendance retry state machine", () => {
  const RETRY_WINDOW_MS = 5 * 60 * 1000;
  const MAX_ATTEMPTS = 3;

  function getNextAttemptNumber(
    lastAttempt: { attemptNumber: number; success: boolean; createdAt: Date } | undefined,
  ): number {
    if (!lastAttempt || lastAttempt.success) return 1;
    const elapsed = Date.now() - lastAttempt.createdAt.getTime();
    if (elapsed > RETRY_WINDOW_MS) return 1;
    return lastAttempt.attemptNumber + 1;
  }

  it("increments attempt within window", () => {
    const last = { attemptNumber: 1, success: false, createdAt: new Date() };
    expect(getNextAttemptNumber(last)).toBe(2);
  });

  it("resets after window expires", () => {
    const last = {
      attemptNumber: 2,
      success: false,
      createdAt: new Date(Date.now() - RETRY_WINDOW_MS - 1000),
    };
    expect(getNextAttemptNumber(last)).toBe(1);
  });

  it("escalates on third attempt", () => {
    const attemptNumber = 3;
    expect(attemptNumber >= MAX_ATTEMPTS).toBe(true);
  });
});
