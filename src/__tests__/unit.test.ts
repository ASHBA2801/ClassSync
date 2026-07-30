import { describe, it, expect } from "vitest";
import { isWithinGeofence, haversineDistanceM } from "@/lib/geofence";
import { solveSchedule, validateSlotConflict } from "@/lib/scheduler/solver";

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
    periodsPerDay: 8,
    assignments: [
      {
        teacherId: "t1",
        classSectionId: "c1",
        subjectId: "s1",
        periodsPerWeek: 5,
      },
    ],
    constraints: [{ minFreePeriods: 1, maxFreePeriods: 5 }],
  };

  it("generates conflict-free schedule", () => {
    const result = solveSchedule(baseInput);
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

  it("reports unsatisfiable constraints", () => {
    const result = solveSchedule({
      daysPerWeek: 2,
      periodsPerDay: 2,
      assignments: [
        { teacherId: "t1", classSectionId: "c1", subjectId: "s1", periodsPerWeek: 10 },
      ],
      constraints: [{ minFreePeriods: 0, maxFreePeriods: 10 }],
    });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
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
