import type { ScheduleAssignment, ScheduleConstraintConfig, SchedulerInput } from "./solver";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface SchedulerLabels {
  teachers: Record<string, string>;
  sections: Record<string, string>;
  subjects: Record<string, string>;
}

export function formatDayName(day: number): string {
  return DAY_NAMES[day] ?? `Day ${day + 1}`;
}

function label(map: Record<string, string>, id: string, fallback: string): string {
  return map[id] ?? fallback;
}

function getConstraint(teacherId: string, constraints: ScheduleConstraintConfig[]) {
  return (
    constraints.find((c) => c.teacherId === teacherId) ??
    constraints.find((c) => !c.teacherId) ?? {
      minFreePerWeek: 1,
      maxFreePerWeek: 10,
    }
  );
}

function teacherWeeklyLoad(assignments: ScheduleAssignment[], teacherId: string): number {
  return assignments
    .filter((a) => a.teacherId === teacherId)
    .reduce((sum, a) => sum + a.periodsPerWeek, 0);
}

/** Pre-flight checks with plain-language errors before running the solver. */
export function analyzeScheduleFeasibility(
  input: SchedulerInput,
  labels: SchedulerLabels,
): string[] {
  const errors: string[] = [];
  const { assignments, constraints, daysPerWeek, periodsPerDay } = input;
  const totalWeeklySlots = daysPerWeek * periodsPerDay;

  const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
  const globalConstraint = constraints.find((c) => !c.teacherId);

  if (globalConstraint && teacherIds.length > 0) {
    const minWeeklyBusy = totalWeeklySlots - globalConstraint.maxFreePerWeek;

    const belowWeeklyMin = teacherIds.filter(
      (id) => teacherWeeklyLoad(assignments, id) < minWeeklyBusy,
    );
    if (belowWeeklyMin.length === teacherIds.length) {
      errors.push(
        `Global rules require every teacher to teach at least ${minWeeklyBusy} periods/week (${totalWeeklySlots} slots minus max ${globalConstraint.maxFreePerWeek} free/week). Your teachers are assigned far less — increase "Max Free / Week" in Schedule Setup → Rules (Step 4), or assign more classes.`,
      );
    }
  }

  for (const teacherId of teacherIds) {
    const teacherName = label(labels.teachers, teacherId, "Unknown teacher");
    const assigned = teacherWeeklyLoad(assignments, teacherId);
    const constraint = getConstraint(teacherId, constraints);

    const minWeeklyBusy = totalWeeklySlots - constraint.maxFreePerWeek;
    const maxWeeklyBusy = totalWeeklySlots - constraint.minFreePerWeek;

    const globalAlreadyReported =
      globalConstraint &&
      teacherIds.every((id) => teacherWeeklyLoad(assignments, id) < minWeeklyBusy);

    if (assigned > maxWeeklyBusy) {
      errors.push(
        `${teacherName} is assigned ${assigned} periods/week, but rules allow at most ${maxWeeklyBusy} (min ${constraint.minFreePerWeek} free/week across ${totalWeeklySlots} slots). Increase "Min Free / Week" or reduce their assignments.`,
      );
    } else if (assigned < minWeeklyBusy && !globalAlreadyReported) {
      errors.push(
        `${teacherName} is assigned ${assigned} periods/week, but rules require at least ${minWeeklyBusy} (max ${constraint.maxFreePerWeek} free/week). Lower "Max Free / Week" or assign more classes.`,
      );
    }
  }

  const sectionIds = [...new Set(assignments.map((a) => a.classSectionId))];
  const requireFull = input.quality?.requireFullSectionWeek !== false;

  for (const sectionId of sectionIds) {
    const sectionName = label(labels.sections, sectionId, "Unknown section");
    const sectionLoad = assignments
      .filter((a) => a.classSectionId === sectionId)
      .reduce((sum, a) => sum + a.periodsPerWeek, 0);

    if (sectionLoad > totalWeeklySlots) {
      errors.push(
        `${sectionName} needs ${sectionLoad} periods/week total, but only ${totalWeeklySlots} slots exist (${periodsPerDay} periods × ${daysPerWeek} days). Add more periods per day or reduce subject hours.`,
      );
    } else if (requireFull && sectionLoad < totalWeeklySlots) {
      errors.push(
        `${sectionName} needs ${totalWeeklySlots} periods/week to fill the timetable (${periodsPerDay} periods × ${daysPerWeek} days), but assigned subjects only sum to ${sectionLoad}. Add subject hours or assign more periods per subject.`,
      );
    }

    if (input.quality) {
      const { maxSameSubjectPerDay } = input.quality;
      const sectionAssignments = assignments.filter((a) => a.classSectionId === sectionId);
      for (const a of sectionAssignments) {
        const subjectName = label(labels.subjects, a.subjectId, "Unknown subject");
        const minDaysNeeded = Math.ceil(a.periodsPerWeek / maxSameSubjectPerDay);
        if (minDaysNeeded > daysPerWeek) {
          errors.push(
            `${sectionName} · ${subjectName}: ${a.periodsPerWeek} periods/week with max ${maxSameSubjectPerDay}/day requires ${minDaysNeeded} days, but only ${daysPerWeek} working days exist. Increase "Max Same Subject / Day" or reduce subject hours.`,
          );
        }
      }
    }
  }

  const totalDemand = assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);
  const totalSupply = totalWeeklySlots * sectionIds.length;
  if (totalDemand > totalSupply) {
    errors.push(
      `Overall demand is ${totalDemand} period-slots across all sections, but capacity is ${totalSupply}. Add periods, days, or sections with fewer subject hours.`,
    );
  }

  return errors;
}

export function formatAssignmentError(
  assignment: ScheduleAssignment,
  placed: number,
  labels: SchedulerLabels,
): string {
  const teacher = label(labels.teachers, assignment.teacherId, "Unknown teacher");
  const section = label(labels.sections, assignment.classSectionId, "Unknown section");
  const subject = label(labels.subjects, assignment.subjectId, "Unknown subject");

  if (placed === 0) {
    return `${section} · ${subject} (${teacher}): no periods could be scheduled (${assignment.periodsPerWeek}/week required). Check free-period rules, teacher double-booking, or available slots.`;
  }

  return `${section} · ${subject} (${teacher}): only ${placed} of ${assignment.periodsPerWeek} required periods/week could be scheduled.`;
}

export function formatTeacherConstraintErrors(
  teacherId: string,
  input: SchedulerInput,
  labels: SchedulerLabels,
  weeklyBusy: number,
): string[] {
  const teacherName = label(labels.teachers, teacherId, "Unknown teacher");
  const constraint = getConstraint(teacherId, input.constraints);
  const errors: string[] = [];
  const totalSlots = input.daysPerWeek * input.periodsPerDay;
  const weeklyFree = totalSlots - weeklyBusy;
  const assigned = teacherWeeklyLoad(input.assignments, teacherId);

  if (weeklyFree < constraint.minFreePerWeek) {
    errors.push(
      `${teacherName}: ${weeklyFree} free periods/week (minimum allowed: ${constraint.minFreePerWeek}). Assigned ${assigned} classes — increase "Min Free / Week" or reduce assignments.`,
    );
  }
  if (weeklyFree > constraint.maxFreePerWeek) {
    errors.push(
      `${teacherName}: ${weeklyFree} free periods/week (maximum allowed: ${constraint.maxFreePerWeek}). Assigned only ${assigned} classes — lower "Max Free / Week" or assign more classes.`,
    );
  }

  return errors;
}

/** Deduplicate and cap verbose solver output for UI display. */
export function summarizeSchedulerErrors(errors: string[], maxItems = 8): string[] {
  const unique = [...new Set(errors)];
  if (unique.length <= maxItems) return unique;

  const remaining = unique.length - maxItems;
  return [...unique.slice(0, maxItems), `…and ${remaining} more similar issue(s). Fix the items above first, then retry.`];
}
