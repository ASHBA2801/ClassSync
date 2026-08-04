import { prisma } from "@/lib/db/prisma";

export type SetupStep =
  | "grades"
  | "sections"
  | "periods"
  | "subjects"
  | "assignments"
  | "constraints"
  | "capacity";

export interface SetupCheck {
  step: SetupStep;
  passed: boolean;
  message: string;
  fixHref?: string;
}

export interface EffectiveConstraint {
  minFreePerDay: number;
  maxFreePerDay: number;
  minFreePerWeek: number;
  maxFreePerWeek: number;
}

export interface ScheduleReadiness {
  isReady: boolean;
  checks: SetupCheck[];
  summary: {
    gradeCount: number;
    sectionCount: number;
    periodCount: number;
    unassignedSlots: Array<{ sectionId: string; sectionName: string; subjectId: string; subjectName: string }>;
    teachersWithoutConstraint: string[];
  };
}

export interface PeriodTimingRow {
  periodNo: number;
  startTime: string;
  endTime: string;
}

export interface GradeRow {
  id: string;
  name: string;
  classSections: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; periodsPerWeek: number; name: string }>;
}

export interface TeacherAssignmentRow {
  teacherId: string;
  classSectionId: string;
  subjectId: string;
}

export interface ScheduleConstraintRow {
  teacherId: string | null;
  minFreePerDay: number;
  maxFreePerDay: number;
  minFreePerWeek: number;
  maxFreePerWeek: number;
}

export function parseTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function validatePeriodTimings(periods: PeriodTimingRow[]): SetupCheck[] {
  const checks: SetupCheck[] = [];

  if (periods.length === 0) {
    checks.push({
      step: "periods",
      passed: false,
      message: "No session periods configured",
      fixHref: "/admin/schedule/setup?step=2",
    });
    return checks;
  }

  const sorted = [...periods].sort((a, b) => a.periodNo - b.periodNo);
  const maxPeriod = sorted[sorted.length - 1].periodNo;

  for (let i = 1; i <= maxPeriod; i++) {
    const period = sorted.find((p) => p.periodNo === i);
    if (!period) {
      checks.push({
        step: "periods",
        passed: false,
        message: `Missing period ${i} — periods must be contiguous from 1 to ${maxPeriod}`,
        fixHref: "/admin/schedule/setup?step=2",
      });
      return checks;
    }

    if (!period.startTime.trim() || !period.endTime.trim()) {
      checks.push({
        step: "periods",
        passed: false,
        message: `Period ${i} is missing start or end time`,
        fixHref: "/admin/schedule/setup?step=2",
      });
      return checks;
    }

    const start = parseTimeToMinutes(period.startTime);
    const end = parseTimeToMinutes(period.endTime);
    if (start === null || end === null || start >= end) {
      checks.push({
        step: "periods",
        passed: false,
        message: `Period ${i} has invalid times (start must be before end)`,
        fixHref: "/admin/schedule/setup?step=2",
      });
      return checks;
    }
  }

  checks.push({
    step: "periods",
    passed: true,
    message: `${periods.length} session periods configured`,
  });

  return checks;
}

export function getEffectiveConstraint(
  teacherId: string,
  constraints: ScheduleConstraintRow[],
): EffectiveConstraint | null {
  const override = constraints.find((c) => c.teacherId === teacherId);
  if (override) {
    return {
      minFreePerDay: override.minFreePerDay,
      maxFreePerDay: override.maxFreePerDay,
      minFreePerWeek: override.minFreePerWeek,
      maxFreePerWeek: override.maxFreePerWeek,
    };
  }

  const global = constraints.find((c) => c.teacherId === null);
  if (!global) return null;

  return {
    minFreePerDay: global.minFreePerDay,
    maxFreePerDay: global.maxFreePerDay,
    minFreePerWeek: global.minFreePerWeek,
    maxFreePerWeek: global.maxFreePerWeek,
  };
}

export function validateConstraintSanity(
  constraint: EffectiveConstraint,
  periodsPerDay: number,
): string | null {
  if (constraint.minFreePerDay > constraint.maxFreePerDay) {
    return "Minimum free periods per day cannot exceed maximum";
  }
  if (constraint.minFreePerWeek > constraint.maxFreePerWeek) {
    return "Minimum free periods per week cannot exceed maximum";
  }
  if (constraint.maxFreePerDay > periodsPerDay) {
    return `Maximum free periods per day (${constraint.maxFreePerDay}) exceeds periods per day (${periodsPerDay})`;
  }
  return null;
}

export interface ReadinessInput {
  grades: GradeRow[];
  periods: PeriodTimingRow[];
  assignments: TeacherAssignmentRow[];
  constraints: ScheduleConstraintRow[];
  daysPerWeek: number;
}

export function evaluateReadinessFromData(input: ReadinessInput): ScheduleReadiness {
  const checks: SetupCheck[] = [];
  const { grades, periods, assignments, constraints, daysPerWeek } = input;

  const gradeCount = grades.length;
  const sectionCount = grades.reduce((sum, g) => sum + g.classSections.length, 0);

  if (gradeCount === 0) {
    checks.push({
      step: "grades",
      passed: false,
      message: "No grades configured",
      fixHref: "/admin/schedule/setup?step=1",
    });
  } else {
    checks.push({
      step: "grades",
      passed: true,
      message: `${gradeCount} grade(s) configured`,
    });
  }

  const gradesWithoutSections = grades.filter((g) => g.classSections.length === 0);
  if (gradesWithoutSections.length > 0) {
    checks.push({
      step: "sections",
      passed: false,
      message: `${gradesWithoutSections.length} grade(s) have no sections: ${gradesWithoutSections.map((g) => g.name).join(", ")}`,
      fixHref: "/admin/schedule/setup?step=1",
    });
  } else if (gradeCount > 0) {
    checks.push({
      step: "sections",
      passed: true,
      message: `${sectionCount} section(s) across all grades`,
    });
  }

  checks.push(...validatePeriodTimings(periods));
  const periodCount = periods.length;

  const gradesWithoutSubjects = grades.filter((g) => g.subjects.length === 0);
  if (gradesWithoutSubjects.length > 0) {
    checks.push({
      step: "subjects",
      passed: false,
      message: `${gradesWithoutSubjects.length} grade(s) have no subjects configured`,
      fixHref: "/admin/schedule/setup?step=3",
    });
  } else if (gradeCount > 0) {
    checks.push({
      step: "subjects",
      passed: true,
      message: "All grades have subjects configured",
    });
  }

  const unassignedSlots: ScheduleReadiness["summary"]["unassignedSlots"] = [];
  for (const grade of grades) {
    for (const section of grade.classSections) {
      for (const subject of grade.subjects) {
        const assigned = assignments.some(
          (a) => a.classSectionId === section.id && a.subjectId === subject.id,
        );
        if (!assigned) {
          unassignedSlots.push({
            sectionId: section.id,
            sectionName: section.name,
            subjectId: subject.id,
            subjectName: subject.name,
          });
        }
      }
    }
  }

  if (unassignedSlots.length > 0) {
    checks.push({
      step: "assignments",
      passed: false,
      message: `${unassignedSlots.length} subject-section pair(s) missing teacher assignments`,
      fixHref: "/admin/schedule/setup?step=4",
    });
  } else if (sectionCount > 0 && grades.some((g) => g.subjects.length > 0)) {
    checks.push({
      step: "assignments",
      passed: true,
      message: "All subject-section pairs have teachers assigned",
    });
  }

  const globalConstraint = constraints.find((c) => c.teacherId === null);
  if (!globalConstraint) {
    checks.push({
      step: "constraints",
      passed: false,
      message: "Global free-period rules not configured",
      fixHref: "/admin/schedule/setup?step=4",
    });
  } else {
    const globalSanity = validateConstraintSanity(globalConstraint, periodCount || 8);
    if (globalSanity) {
      checks.push({
        step: "constraints",
        passed: false,
        message: `Global constraint invalid: ${globalSanity}`,
        fixHref: "/admin/schedule/setup?step=4",
      });
    } else {
      checks.push({
        step: "constraints",
        passed: true,
        message: "Global free-period rules configured",
      });
    }
  }

  const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
  const teachersWithoutConstraint: string[] = [];

  for (const teacherId of teacherIds) {
    const effective = getEffectiveConstraint(teacherId, constraints);
    if (!effective) {
      teachersWithoutConstraint.push(teacherId);
      continue;
    }
    const sanity = validateConstraintSanity(effective, periodCount || 8);
    if (sanity) {
      checks.push({
        step: "constraints",
        passed: false,
        message: `Teacher constraint invalid: ${sanity}`,
        fixHref: "/admin/schedule/setup?step=4",
      });
    }
  }

  if (teachersWithoutConstraint.length > 0 && globalConstraint) {
    checks.push({
      step: "constraints",
      passed: true,
      message: "All teachers have effective free-period rules (global or override)",
    });
  }

  const periodsPerDay = periodCount || 0;
  let totalRequiredPeriods = 0;
  for (const grade of grades) {
    for (const section of grade.classSections) {
      for (const subject of grade.subjects) {
        const assignment = assignments.find(
          (a) => a.classSectionId === section.id && a.subjectId === subject.id,
        );
        totalRequiredPeriods += assignment ? subject.periodsPerWeek : subject.periodsPerWeek;
      }
    }
  }

  const maxCapacity = daysPerWeek * periodsPerDay * Math.max(sectionCount, 1);
  if (totalRequiredPeriods > maxCapacity && periodsPerDay > 0 && sectionCount > 0) {
    checks.push({
      step: "capacity",
      passed: false,
      message: `Total required periods (${totalRequiredPeriods}) exceeds available capacity (${maxCapacity})`,
      fixHref: "/admin/schedule/setup?step=2",
    });
  } else if (totalRequiredPeriods > 0 && periodsPerDay > 0) {
    checks.push({
      step: "capacity",
      passed: true,
      message: `Capacity check passed (${totalRequiredPeriods}/${maxCapacity} period-slots required)`,
    });
  }

  const isReady = checks.every((c) => c.passed);

  return {
    isReady,
    checks,
    summary: {
      gradeCount,
      sectionCount,
      periodCount,
      unassignedSlots,
      teachersWithoutConstraint,
    },
  };
}

export async function evaluateScheduleReadiness(schoolId: string): Promise<ScheduleReadiness> {
  const [grades, periods, assignments, constraints, scheduleConfig] = await Promise.all([
    prisma.grade.findMany({
      where: { schoolId },
      include: {
        classSections: { select: { id: true, name: true } },
        subjects: {
          select: { id: true, name: true, periodsPerWeek: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.periodTiming.findMany({
      where: { schoolId },
      orderBy: { periodNo: "asc" },
    }),
    prisma.teacherAssignment.findMany({
      where: { schoolId },
      select: { teacherId: true, classSectionId: true, subjectId: true },
    }),
    prisma.scheduleConstraint.findMany({ where: { schoolId } }),
    prisma.schoolScheduleConfig.findUnique({ where: { schoolId } }),
  ]);

  return evaluateReadinessFromData({
    grades,
    periods,
    assignments,
    constraints,
    daysPerWeek: scheduleConfig?.daysPerWeek ?? 5,
  });
}
