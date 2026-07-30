export interface ScheduleAssignment {
  teacherId: string;
  classSectionId: string;
  subjectId: string;
  periodsPerWeek: number;
}

export interface ScheduleConstraintConfig {
  teacherId?: string;
  minFreePeriods: number;
  maxFreePeriods: number;
}

export interface PeriodConfig {
  periodNo: number;
  startTime: string;
  endTime: string;
}

export interface ScheduleSlotInput {
  dayOfWeek: number;
  periodNo: number;
  teacherId: string;
  classSectionId: string;
  subjectId: string;
}

export interface SchedulerInput {
  daysPerWeek: number;
  periodsPerDay: number;
  assignments: ScheduleAssignment[];
  constraints: ScheduleConstraintConfig[];
}

export interface SchedulerResult {
  success: boolean;
  slots: ScheduleSlotInput[];
  errors: string[];
}

export function solveSchedule(input: SchedulerInput): SchedulerResult {
  const { daysPerWeek, periodsPerDay, assignments, constraints } = input;
  const slots: ScheduleSlotInput[] = [];
  const errors: string[] = [];

  const teacherBusy = new Map<string, Set<string>>();
  const classBusy = new Map<string, Set<string>>();
  const teacherPeriodCount = new Map<string, number>();
  const teacherFreePeriods = new Map<string, number>();

  function slotKey(day: number, period: number) {
    return `${day}-${period}`;
  }

  function getConstraint(teacherId: string) {
    return (
      constraints.find((c) => c.teacherId === teacherId) ??
      constraints.find((c) => !c.teacherId) ?? { minFreePeriods: 1, maxFreePeriods: 3 }
    );
  }

  for (const assignment of assignments) {
    let placed = 0;
    const needed = assignment.periodsPerWeek;

    for (let day = 0; day < daysPerWeek && placed < needed; day++) {
      for (let period = 1; period <= periodsPerDay && placed < needed; period++) {
        const key = slotKey(day, period);
        const tBusy = teacherBusy.get(assignment.teacherId) ?? new Set();
        const cBusy = classBusy.get(assignment.classSectionId) ?? new Set();

        if (tBusy.has(key) || cBusy.has(key)) continue;

        const constraint = getConstraint(assignment.teacherId);
        const currentCount = teacherPeriodCount.get(assignment.teacherId) ?? 0;
        const totalSlots = daysPerWeek * periodsPerDay;
        const freeAfter = totalSlots - currentCount - 1;

        if (freeAfter < constraint.minFreePeriods) continue;

        slots.push({
          dayOfWeek: day,
          periodNo: period,
          teacherId: assignment.teacherId,
          classSectionId: assignment.classSectionId,
          subjectId: assignment.subjectId,
        });

        tBusy.add(key);
        cBusy.add(key);
        teacherBusy.set(assignment.teacherId, tBusy);
        classBusy.set(assignment.classSectionId, cBusy);
        teacherPeriodCount.set(assignment.teacherId, currentCount + 1);
        placed++;
      }
    }

    if (placed < needed) {
      errors.push(
        `Could not place all periods for assignment (teacher=${assignment.teacherId}, subject=${assignment.subjectId}): placed ${placed}/${needed}`,
      );
    }
  }

  for (const [teacherId, count] of teacherPeriodCount) {
    const constraint = getConstraint(teacherId);
    const totalSlots = daysPerWeek * periodsPerDay;
    const freePeriods = totalSlots - count;
    teacherFreePeriods.set(teacherId, freePeriods);

    if (freePeriods > constraint.maxFreePeriods) {
      errors.push(
        `Teacher ${teacherId} has ${freePeriods} free periods (max: ${constraint.maxFreePeriods})`,
      );
    }
    if (freePeriods < constraint.minFreePeriods) {
      errors.push(
        `Teacher ${teacherId} has ${freePeriods} free periods (min: ${constraint.minFreePeriods})`,
      );
    }
  }

  return { success: errors.length === 0, slots, errors };
}

export function validateSlotConflict(
  slots: ScheduleSlotInput[],
  newSlot: ScheduleSlotInput,
  excludeIndex?: number,
): string | null {
  for (let i = 0; i < slots.length; i++) {
    if (excludeIndex !== undefined && i === excludeIndex) continue;
    const existing = slots[i];
    if (existing.dayOfWeek !== newSlot.dayOfWeek || existing.periodNo !== newSlot.periodNo) {
      continue;
    }
    if (existing.teacherId === newSlot.teacherId) {
      return "Teacher is already booked in this period";
    }
    if (existing.classSectionId === newSlot.classSectionId) {
      return "Class section is already booked in this period";
    }
  }
  return null;
}
