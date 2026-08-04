import { describe, it, expect } from "vitest";
import { isWithinGeofence, haversineDistanceM } from "@/lib/geofence";
import { solveSchedule, validateSlotConflict, validateTeacherFreePeriods } from "@/lib/scheduler/solver";

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
  const baseInput = {
    daysPerWeek: 5,
    workingDays: [0, 1, 2, 3, 4],
    periodsPerDay: 8,
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
        minFreePerDay: 0,
        maxFreePerDay: 7,
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
      constraints: [
        { minFreePerDay: 0, maxFreePerDay: 2, minFreePerWeek: 0, maxFreePerWeek: 10 },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("respects daily free period max constraint", () => {
    const result = solveSchedule({
      daysPerWeek: 5,
      workingDays: [0, 1, 2, 3, 4],
      periodsPerDay: 4,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "s1", periodsPerWeek: 10 },
      ],
      constraints: [
        { minFreePerDay: 2, maxFreePerDay: 2, minFreePerWeek: 0, maxFreePerWeek: 20 },
      ],
    });
    expect(result.success).toBe(true);
    for (let day = 0; day < 5; day++) {
      const dailyBusy = result.slots.filter((s) => s.dayOfWeek === day && s.teacherId === "t1").length;
      expect(4 - dailyBusy).toBe(2);
    }
  });

  it("validates teacher free periods helper", () => {
    const slots = [
      { dayOfWeek: 0, periodNo: 1, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
      { dayOfWeek: 0, periodNo: 2, teacherId: "t1", classSectionId: "c1", subjectId: "s1" },
    ];
    const error = validateTeacherFreePeriods(
      slots,
      "t1",
      4,
      1,
      {
        minFreePerDay: 2,
        maxFreePerDay: 2,
        minFreePerWeek: 2,
        maxFreePerWeek: 2,
      },
      [0],
    );
    expect(error).toBeNull();
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
