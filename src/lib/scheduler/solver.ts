import {
  formatAssignmentError,
  formatTeacherConstraintErrors,
} from "./errors";

export interface ScheduleAssignment {
  teacherId: string;
  classSectionId: string;
  subjectId: string;
  periodsPerWeek: number;
}

export interface ScheduleConstraintConfig {
  teacherId?: string;
  /** Minimum free periods per week. 0 disables the minimum requirement. */
  minFreePerWeek: number;
  maxFreePerWeek: number;
}

export interface TimetableQualityConfig {
  maxSameSubjectPerDay: number;
  maxConsecutiveSameSubject: number;
  requireFullSectionWeek: boolean;
}

export const DEFAULT_TIMETABLE_QUALITY: TimetableQualityConfig = {
  maxSameSubjectPerDay: 2,
  maxConsecutiveSameSubject: 3,
  requireFullSectionWeek: true,
};

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
  workingDays: number[];
  periodsPerDay: number;
  assignments: ScheduleAssignment[];
  constraints: ScheduleConstraintConfig[];
  quality?: TimetableQualityConfig;
  labels?: import("./errors").SchedulerLabels;
}

export interface SchedulerResult {
  success: boolean;
  slots: ScheduleSlotInput[];
  errors: string[];
}

interface PeriodToken {
  assignmentIndex: number;
  teacherId: string;
  classSectionId: string;
  subjectId: string;
}

interface SearchState {
  slots: ScheduleSlotInput[];
  teacherBusy: Map<string, Set<string>>;
  classBusy: Map<string, Set<string>>;
  teacherWeeklyCount: Map<string, number>;
  assignmentPlaced: number[];
}

function slotKey(day: number, period: number) {
  return `${day}-${period}`;
}

function getQuality(input: SchedulerInput): TimetableQualityConfig {
  return input.quality ?? DEFAULT_TIMETABLE_QUALITY;
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

function createInitialState(assignments: ScheduleAssignment[]): SearchState {
  return {
    slots: [],
    teacherBusy: new Map(),
    classBusy: new Map(),
    teacherWeeklyCount: new Map(),
    assignmentPlaced: assignments.map(() => 0),
  };
}

function getSectionDaySlots(
  state: SearchState,
  classSectionId: string,
  day: number,
): ScheduleSlotInput[] {
  return state.slots.filter(
    (s) => s.classSectionId === classSectionId && s.dayOfWeek === day,
  );
}

function countSameSubjectOnDay(
  state: SearchState,
  classSectionId: string,
  day: number,
  subjectId: string,
): number {
  return getSectionDaySlots(state, classSectionId, day).filter(
    (s) => s.subjectId === subjectId,
  ).length;
}

function longestConsecutiveSameSubject(
  state: SearchState,
  classSectionId: string,
  day: number,
  subjectId: string,
  periodsPerDay: number,
  extraPeriod?: number,
): number {
  const periods = new Set(
    getSectionDaySlots(state, classSectionId, day)
      .filter((s) => s.subjectId === subjectId)
      .map((s) => s.periodNo),
  );
  if (extraPeriod !== undefined) periods.add(extraPeriod);

  let maxRun = 0;
  for (let p = 1; p <= periodsPerDay; p++) {
    if (!periods.has(p)) continue;
    let run = 1;
    while (p + run <= periodsPerDay && periods.has(p + run)) run++;
    maxRun = Math.max(maxRun, run);
    p += run - 1;
  }
  return maxRun;
}

function violatesQualityRules(
  token: PeriodToken,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
): boolean {
  const quality = getQuality(input);

  if (
    countSameSubjectOnDay(state, token.classSectionId, day, token.subjectId) >=
    quality.maxSameSubjectPerDay
  ) {
    return true;
  }

  if (
    longestConsecutiveSameSubject(
      state,
      token.classSectionId,
      day,
      token.subjectId,
      input.periodsPerDay,
      period,
    ) > quality.maxConsecutiveSameSubject
  ) {
    return true;
  }

  return false;
}

function countRemainingForTeacher(
  currentToken: PeriodToken,
  state: SearchState,
  input: SchedulerInput,
): number {
  let remaining = 0;
  input.assignments.forEach((a, i) => {
    if (a.teacherId === currentToken.teacherId) {
      remaining += a.periodsPerWeek - state.assignmentPlaced[i];
    }
  });
  return Math.max(0, remaining - 1);
}

function canPlace(
  token: PeriodToken,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
): boolean {
  const key = slotKey(day, period);
  const tBusy = state.teacherBusy.get(token.teacherId) ?? new Set();
  const cBusy = state.classBusy.get(token.classSectionId) ?? new Set();

  if (tBusy.has(key) || cBusy.has(key)) return false;

  if (violatesQualityRules(token, day, period, state, input)) return false;

  const constraint = getConstraint(token.teacherId, input.constraints);
  const weeklyBusy = state.teacherWeeklyCount.get(token.teacherId) ?? 0;

  const weeklyFreeAfter = input.daysPerWeek * input.periodsPerDay - weeklyBusy - 1;
  const minWeeklyFreeNeeded = constraint.minFreePerWeek;
  const tokensRemainingForTeacher = countRemainingForTeacher(token, state, input);
  const maxPossibleWeeklyBusy = weeklyBusy + 1 + tokensRemainingForTeacher;
  const minPossibleWeeklyFree =
    input.daysPerWeek * input.periodsPerDay - maxPossibleWeeklyBusy;
  if (minPossibleWeeklyFree < minWeeklyFreeNeeded) return false;

  if (weeklyFreeAfter > constraint.maxFreePerWeek) {
    const mustPlaceMore =
      tokensRemainingForTeacher > 0 ||
      input.assignments.some(
        (a, i) =>
          a.teacherId === token.teacherId &&
          state.assignmentPlaced[i] < a.periodsPerWeek,
      );
    if (!mustPlaceMore && weeklyFreeAfter > constraint.maxFreePerWeek) return false;
  }

  return true;
}

function scoreCandidate(
  token: PeriodToken,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
): number {
  const daySlots = getSectionDaySlots(state, token.classSectionId, day);
  const occupied = new Set(daySlots.map((s) => s.periodNo));
  const weeklyByDay = new Map<number, number>();
  for (const s of state.slots) {
    if (s.classSectionId !== token.classSectionId) continue;
    weeklyByDay.set(s.dayOfWeek, (weeklyByDay.get(s.dayOfWeek) ?? 0) + 1);
  }

  let score = (weeklyByDay.get(day) ?? 0) * 1000;
  score += period * 10;

  if (occupied.has(period - 1) || occupied.has(period + 1)) {
    score -= 500;
  } else if (daySlots.length > 0) {
    score += 800;
  }

  score += day * 1;
  return score;
}

function applyPlacement(
  token: PeriodToken,
  day: number,
  period: number,
  state: SearchState,
): ScheduleSlotInput {
  const key = slotKey(day, period);
  const slot: ScheduleSlotInput = {
    dayOfWeek: day,
    periodNo: period,
    teacherId: token.teacherId,
    classSectionId: token.classSectionId,
    subjectId: token.subjectId,
  };

  state.slots.push(slot);

  const tBusy = state.teacherBusy.get(token.teacherId) ?? new Set();
  tBusy.add(key);
  state.teacherBusy.set(token.teacherId, tBusy);

  const cBusy = state.classBusy.get(token.classSectionId) ?? new Set();
  cBusy.add(key);
  state.classBusy.set(token.classSectionId, cBusy);

  state.teacherWeeklyCount.set(
    token.teacherId,
    (state.teacherWeeklyCount.get(token.teacherId) ?? 0) + 1,
  );

  state.assignmentPlaced[token.assignmentIndex]++;

  return slot;
}

function undoPlacement(token: PeriodToken, day: number, period: number, state: SearchState) {
  const key = slotKey(day, period);
  state.slots.pop();

  state.teacherBusy.get(token.teacherId)?.delete(key);
  state.classBusy.get(token.classSectionId)?.delete(key);

  state.teacherWeeklyCount.set(
    token.teacherId,
    (state.teacherWeeklyCount.get(token.teacherId) ?? 1) - 1,
  );

  state.assignmentPlaced[token.assignmentIndex]--;
}

function validateSectionQuality(
  sectionId: string,
  state: SearchState,
  input: SchedulerInput,
  labels: import("./errors").SchedulerLabels,
): string[] {
  const errors: string[] = [];
  const quality = getQuality(input);
  const sectionName = labels.sections[sectionId] ?? "Unknown section";
  const days = input.workingDays.slice(0, input.daysPerWeek);
  const expectedWeekly = input.daysPerWeek * input.periodsPerDay;

  const sectionSlots = state.slots.filter((s) => s.classSectionId === sectionId);

  if (quality.requireFullSectionWeek) {
    if (sectionSlots.length !== expectedWeekly) {
      errors.push(
        `${sectionName}: expected ${expectedWeekly} scheduled periods but got ${sectionSlots.length}.`,
      );
    }
    for (const day of days) {
      const dayCount = sectionSlots.filter((s) => s.dayOfWeek === day).length;
      if (dayCount !== input.periodsPerDay) {
        errors.push(
          `${sectionName} on day ${day}: expected ${input.periodsPerDay} periods but got ${dayCount}.`,
        );
      }
    }
  }

  for (const day of days) {
    const daySlots = sectionSlots.filter((s) => s.dayOfWeek === day);
    const bySubject = new Map<string, number>();
    for (const s of daySlots) {
      bySubject.set(s.subjectId, (bySubject.get(s.subjectId) ?? 0) + 1);
    }
    for (const [subjectId, count] of bySubject) {
      if (count > quality.maxSameSubjectPerDay) {
        const subjectName = labels.subjects[subjectId] ?? subjectId;
        errors.push(
          `${sectionName} · ${subjectName} on day ${day}: ${count} periods exceeds max ${quality.maxSameSubjectPerDay}/day.`,
        );
      }
      const longest = longestConsecutiveSameSubject(
        { ...state, slots: daySlots },
        sectionId,
        day,
        subjectId,
        input.periodsPerDay,
      );
      if (longest > quality.maxConsecutiveSameSubject) {
        const subjectName = labels.subjects[subjectId] ?? subjectId;
        errors.push(
          `${sectionName} · ${subjectName} on day ${day}: ${longest} consecutive periods exceeds max ${quality.maxConsecutiveSameSubject}.`,
        );
      }
    }
  }

  return errors;
}

function validateFinalState(state: SearchState, input: SchedulerInput): string[] {
  const errors: string[] = [];
  const labels = input.labels ?? { teachers: {}, sections: {}, subjects: {} };

  input.assignments.forEach((assignment, i) => {
    const placed = state.assignmentPlaced[i];
    if (placed < assignment.periodsPerWeek) {
      errors.push(formatAssignmentError(assignment, placed, labels));
    }
  });

  const teacherIds = new Set(input.assignments.map((a) => a.teacherId));
  for (const teacherId of teacherIds) {
    const weeklyBusy = state.teacherWeeklyCount.get(teacherId) ?? 0;
    errors.push(...formatTeacherConstraintErrors(teacherId, input, labels, weeklyBusy));
  }

  const sectionIds = new Set(input.assignments.map((a) => a.classSectionId));
  for (const sectionId of sectionIds) {
    errors.push(...validateSectionQuality(sectionId, state, input, labels));
  }

  return errors;
}

function scoreAssignmentCandidate(
  assignmentIndex: number,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
): number {
  const assignment = input.assignments[assignmentIndex];
  const token: PeriodToken = {
    assignmentIndex,
    teacherId: assignment.teacherId,
    classSectionId: assignment.classSectionId,
    subjectId: assignment.subjectId,
  };
  return scoreCandidate(token, day, period, state, input);
}

function getAssignmentCandidates(
  sectionId: string,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
): number[] {
  const candidates: Array<{ index: number; score: number }> = [];

  input.assignments.forEach((assignment, assignmentIndex) => {
    if (assignment.classSectionId !== sectionId) return;
    if (state.assignmentPlaced[assignmentIndex] >= assignment.periodsPerWeek) return;

    const token: PeriodToken = {
      assignmentIndex,
      teacherId: assignment.teacherId,
      classSectionId: assignment.classSectionId,
      subjectId: assignment.subjectId,
    };
    if (!canPlace(token, day, period, state, input)) return;

    candidates.push({
      index: assignmentIndex,
      score: scoreAssignmentCandidate(assignmentIndex, day, period, state, input),
    });
  });

  candidates.sort((a, b) => a.score - b.score || a.index - b.index);
  return candidates.map((c) => c.index);
}

function shuffleWithSeed(values: number[], seed: number): number[] {
  const arr = [...values];
  let s = seed + 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function trailingRunLength(items: string[], subjectId: string): number {
  let run = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i] !== subjectId) break;
    run++;
  }
  return run;
}

function arrangeSubjectsForDay(pool: string[], maxConsecutive: number): string[] | null {
  const remaining = [...pool];
  const result: string[] = [];

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const countA = remaining.filter((s) => s === a).length;
      const countB = remaining.filter((s) => s === b).length;
      return countB - countA;
    });

    let placed = false;
    for (let i = 0; i < remaining.length; i++) {
      const subjectId = remaining[i];
      if (trailingRunLength(result, subjectId) < maxConsecutive) {
        result.push(subjectId);
        remaining.splice(i, 1);
        placed = true;
        break;
      }
    }

    if (!placed) return null;
  }

  return result;
}

function buildGreedySectionPlans(
  sectionId: string,
  input: SchedulerInput,
): Map<number, string[]> | null {
  const quality = getQuality(input);
  const days = input.workingDays.slice(0, input.daysPerWeek);
  const sectionAssignments = input.assignments.filter((a) => a.classSectionId === sectionId);
  const subjectIds = [...new Set(sectionAssignments.map((a) => a.subjectId))];
  if (subjectIds.length === 0) return null;

  const remaining = new Map<string, number>();
  for (const assignment of sectionAssignments) {
    remaining.set(assignment.subjectId, assignment.periodsPerWeek);
  }

  const daily = new Map<number, Map<string, number>>();
  for (const day of days) {
    daily.set(day, new Map());
    let slotsLeft = input.periodsPerDay;

    while (slotsLeft > 0) {
      const dayMap = daily.get(day)!;
      const candidates = subjectIds
        .filter((id) => (remaining.get(id) ?? 0) > 0 && (dayMap.get(id) ?? 0) < quality.maxSameSubjectPerDay)
        .sort((a, b) => (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0));

      if (candidates.length === 0) return null;

      const pick = candidates[0];
      dayMap.set(pick, (dayMap.get(pick) ?? 0) + 1);
      remaining.set(pick, (remaining.get(pick) ?? 0) - 1);
      slotsLeft--;
    }
  }

  for (const left of remaining.values()) {
    if (left !== 0) return null;
  }

  const plans = new Map<number, string[]>();
  for (const day of days) {
    const dayMap = daily.get(day)!;
    const pool: string[] = [];
    for (const subjectId of subjectIds) {
      const count = dayMap.get(subjectId) ?? 0;
      for (let i = 0; i < count; i++) pool.push(subjectId);
    }

    if (quality.requireFullSectionWeek && pool.length !== input.periodsPerDay) {
      return null;
    }

    const arranged = arrangeSubjectsForDay(pool, quality.maxConsecutiveSameSubject);
    if (!arranged) return null;
    plans.set(day, arranged);
  }

  return plans;
}

function assignmentFor(
  sectionId: string,
  subjectId: string,
  input: SchedulerInput,
): ScheduleAssignment | undefined {
  return input.assignments.find(
    (a) => a.classSectionId === sectionId && a.subjectId === subjectId,
  );
}

function slotsFromPlans(
  sectionPlans: Map<string, Map<number, string[]>>,
  input: SchedulerInput,
): ScheduleSlotInput[] {
  const slots: ScheduleSlotInput[] = [];
  for (const [sectionId, dayPlans] of sectionPlans) {
    for (const [day, subjects] of dayPlans) {
      subjects.forEach((subjectId, index) => {
        const assignment = assignmentFor(sectionId, subjectId, input);
        if (!assignment) return;
        slots.push({
          dayOfWeek: day,
          periodNo: index + 1,
          teacherId: assignment.teacherId,
          classSectionId: sectionId,
          subjectId,
        });
      });
    }
  }
  return slots;
}

function teacherConflictAtSlot(
  slots: ScheduleSlotInput[],
  day: number,
  period: number,
): boolean {
  const atSlot = slots.filter((s) => s.dayOfWeek === day && s.periodNo === period);
  const teachers = new Set(atSlot.map((s) => s.teacherId));
  return teachers.size !== atSlot.length;
}

function trySwapDayPeriods(
  plan: string[],
  p1: number,
  p2: number,
  maxConsecutive: number,
): string[] | null {
  if (p1 === p2) return [...plan];
  const next = [...plan];
  [next[p1], next[p2]] = [next[p2], next[p1]];
  return isDayArrangementValid(next, maxConsecutive) ? next : null;
}

function isDayArrangementValid(dayPlan: string[], maxConsecutive: number): boolean {
  let run = 1;
  for (let i = 1; i < dayPlan.length; i++) {
    if (dayPlan[i] === dayPlan[i - 1]) {
      run++;
      if (run > maxConsecutive) return false;
    } else {
      run = 1;
    }
  }
  return true;
}

function resolveSharedTeacherConflicts(
  sectionPlans: Map<string, Map<number, string[]>>,
  input: SchedulerInput,
  sectionOrder: string[],
): Map<string, Map<number, string[]>> | null {
  const quality = getQuality(input);
  const days = input.workingDays.slice(0, input.daysPerWeek);

  for (const day of days) {
    for (let period = 1; period <= input.periodsPerDay; period++) {
      let slots = slotsFromPlans(sectionPlans, input);
      if (!teacherConflictAtSlot(slots, day, period)) continue;

      let fixed = false;
      for (let attempt = 0; attempt < input.periodsPerDay * 4; attempt++) {
        const sectionToAdjust = sectionOrder[attempt % sectionOrder.length];
        const plan = sectionPlans.get(sectionToAdjust)?.get(day);
        if (!plan) continue;

        const p1 = (period - 1 + attempt) % plan.length;
        for (let p2 = 0; p2 < plan.length; p2++) {
          if (p1 === p2) continue;
          const swapped = trySwapDayPeriods(plan, p1, p2, quality.maxConsecutiveSameSubject);
          if (!swapped) continue;

          sectionPlans.get(sectionToAdjust)!.set(day, swapped);
          slots = slotsFromPlans(sectionPlans, input);
          if (!teacherConflictAtSlot(slots, day, period)) {
            fixed = true;
            break;
          }
        }
        if (fixed) break;
      }

      if (!fixed) return null;
    }
  }

  return sectionPlans;
}

function stateFromSlots(
  slots: ScheduleSlotInput[],
  assignments: ScheduleAssignment[],
): SearchState {
  const state = createInitialState(assignments);
  for (const slot of slots) {
    const assignmentIndex = assignments.findIndex(
      (a) =>
        a.classSectionId === slot.classSectionId &&
        a.subjectId === slot.subjectId &&
        a.teacherId === slot.teacherId,
    );
    if (assignmentIndex < 0) continue;
    const token: PeriodToken = {
      assignmentIndex,
      teacherId: slot.teacherId,
      classSectionId: slot.classSectionId,
      subjectId: slot.subjectId,
    };
    applyPlacement(token, slot.dayOfWeek, slot.periodNo, state);
  }
  return state;
}

function solveGreedyConstructive(input: SchedulerInput): ScheduleSlotInput[] | null {
  const sectionIds = getSectionIds(input);
  const sectionPlans = new Map<string, Map<number, string[]>>();

  for (const sectionId of sectionIds) {
    const plan = buildGreedySectionPlans(sectionId, input);
    if (!plan) return null;
    sectionPlans.set(sectionId, plan);
  }

  const resolved =
    sectionIds.length > 1
      ? resolveSharedTeacherConflicts(sectionPlans, input, sectionIds)
      : sectionPlans;
  if (!resolved) return null;

  const slots = slotsFromPlans(resolved, input);
  const state = stateFromSlots(slots, input.assignments);
  if (validateFinalState(state, input).length > 0) return null;
  return slots;
}

function buildSlotOrder(input: SchedulerInput): Array<{ day: number; period: number }> {
  const days = input.workingDays.slice(0, input.daysPerWeek);
  const order: Array<{ day: number; period: number }> = [];
  for (const day of days) {
    for (let period = 1; period <= input.periodsPerDay; period++) {
      order.push({ day, period });
    }
  }
  return order;
}

function getSectionIds(input: SchedulerInput): string[] {
  return [...new Set(input.assignments.map((a) => a.classSectionId))].sort();
}

function sectionNeedsSlot(
  sectionId: string,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
): boolean {
  const quality = getQuality(input);
  const key = slotKey(day, period);
  if (state.classBusy.get(sectionId)?.has(key)) return false;

  if (quality.requireFullSectionWeek) return true;

  return input.assignments.some(
    (a, i) =>
      a.classSectionId === sectionId && state.assignmentPlaced[i] < a.periodsPerWeek,
  );
}

interface SlotCentricContext {
  slotOrder: Array<{ day: number; period: number }>;
  sectionIds: string[];
  restartSeed: number;
}

const SOLVER_TIMEOUT_MS = 30_000;
const SOLVER_RESTARTS = 24;

function orderSectionCandidates(
  sectionId: string,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
  restartSeed: number,
): number[] {
  const base = getAssignmentCandidates(sectionId, day, period, state, input);
  if (restartSeed === 0 || base.length <= 1) return base;
  return shuffleWithSeed(base, restartSeed + sectionId.charCodeAt(0) + day * 17 + period);
}

function solveSlotCentric(
  slotIndex: number,
  state: SearchState,
  input: SchedulerInput,
  ctx: SlotCentricContext,
  deadline: number,
): boolean {
  if (Date.now() > deadline) return false;

  if (slotIndex >= ctx.slotOrder.length) {
    return validateFinalState(state, input).length === 0;
  }

  const { day, period } = ctx.slotOrder[slotIndex];
  const quality = getQuality(input);

  if (!quality.requireFullSectionWeek) {
    if (solveSlotCentric(slotIndex + 1, state, input, ctx, deadline)) {
      return true;
    }

    for (const sectionId of ctx.sectionIds) {
      const key = slotKey(day, period);
      if (state.classBusy.get(sectionId)?.has(key)) continue;

      const candidates = orderSectionCandidates(
        sectionId,
        day,
        period,
        state,
        input,
        ctx.restartSeed,
      );

      for (const assignmentIndex of candidates) {
        const assignment = input.assignments[assignmentIndex];
        const token: PeriodToken = {
          assignmentIndex,
          teacherId: assignment.teacherId,
          classSectionId: assignment.classSectionId,
          subjectId: assignment.subjectId,
        };
        applyPlacement(token, day, period, state);
        if (solveSlotCentric(slotIndex + 1, state, input, ctx, deadline)) {
          return true;
        }
        undoPlacement(token, day, period, state);
      }
    }

    return false;
  }

  const sectionsThisSlot = ctx.sectionIds.filter((sectionId) =>
    sectionNeedsSlot(sectionId, day, period, state, input),
  );

  if (sectionsThisSlot.length === 0) {
    return solveSlotCentric(slotIndex + 1, state, input, ctx, deadline);
  }

  return fillSlotSections(0, sectionsThisSlot, slotIndex, day, period, state, input, ctx, deadline);
}

function fillSlotSections(
  sectionPos: number,
  sectionsThisSlot: string[],
  slotIndex: number,
  day: number,
  period: number,
  state: SearchState,
  input: SchedulerInput,
  ctx: SlotCentricContext,
  deadline: number,
): boolean {
  if (Date.now() > deadline) return false;

  if (sectionPos >= sectionsThisSlot.length) {
    return solveSlotCentric(slotIndex + 1, state, input, ctx, deadline);
  }

  const sectionId = sectionsThisSlot[sectionPos];
  const candidates = orderSectionCandidates(
    sectionId,
    day,
    period,
    state,
    input,
    ctx.restartSeed,
  );

  for (const assignmentIndex of candidates) {
    const assignment = input.assignments[assignmentIndex];
    const token: PeriodToken = {
      assignmentIndex,
      teacherId: assignment.teacherId,
      classSectionId: assignment.classSectionId,
      subjectId: assignment.subjectId,
    };

    applyPlacement(token, day, period, state);
    if (
      fillSlotSections(
        sectionPos + 1,
        sectionsThisSlot,
        slotIndex,
        day,
        period,
        state,
        input,
        ctx,
        deadline,
      )
    ) {
      return true;
    }
    undoPlacement(token, day, period, state);
  }

  return false;
}

function runSlotCentricSolver(input: SchedulerInput, deadline: number): SearchState | null {
  const slotOrder = buildSlotOrder(input);
  const sectionIds = getSectionIds(input);

  for (let restart = 0; restart < SOLVER_RESTARTS; restart++) {
    if (Date.now() > deadline) break;

    const state = createInitialState(input.assignments);
    const ctx: SlotCentricContext = { slotOrder, sectionIds, restartSeed: restart };

    if (solveSlotCentric(0, state, input, ctx, deadline)) {
      return state;
    }
  }

  return null;
}

export function solveSchedule(input: SchedulerInput): SchedulerResult {
  const errors: string[] = [];
  const { assignments, constraints } = input;

  if (assignments.length === 0) {
    return { success: false, slots: [], errors: ["No teacher assignments to schedule"] };
  }

  if (constraints.filter((c) => !c.teacherId).length === 0 && constraints.length === 0) {
    input = {
      ...input,
      constraints: [
        ...constraints,
        { minFreePerWeek: 1, maxFreePerWeek: 10 },
      ],
    };
  }

  if (!input.quality) {
    input = { ...input, quality: DEFAULT_TIMETABLE_QUALITY };
  }

  const greedySlots = solveGreedyConstructive(input);
  if (greedySlots) {
    return { success: true, slots: greedySlots, errors: [] };
  }

  const deadline = Date.now() + SOLVER_TIMEOUT_MS;
  const solvedState = runSlotCentricSolver(input, deadline);

  if (solvedState) {
    return { success: true, slots: solvedState.slots, errors: [] };
  }

  if (Date.now() > deadline) {
    errors.push(
      "Schedule generation timed out — try relaxing timetable quality rules or free-period rules.",
    );
  } else {
    errors.push(
      "Could not find a valid timetable with the current assignments and rules. Review the suggestions below.",
    );
  }

  return { success: false, slots: [], errors };
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

export function validateTeacherFreePeriods(
  slots: ScheduleSlotInput[],
  teacherId: string,
  periodsPerDay: number,
  daysPerWeek: number,
  constraint: ScheduleConstraintConfig,
): string | null {
  const teacherSlots = slots.filter((s) => s.teacherId === teacherId);
  const weeklyBusy = teacherSlots.length;
  const totalSlots = daysPerWeek * periodsPerDay;
  const weeklyFree = totalSlots - weeklyBusy;

  if (weeklyFree < constraint.minFreePerWeek || weeklyFree > constraint.maxFreePerWeek) {
    return `Teacher free periods per week (${weeklyFree}) outside allowed range [${constraint.minFreePerWeek}, ${constraint.maxFreePerWeek}]`;
  }

  return null;
}

/** Exported for tests */
export function validateSectionScheduleQuality(
  slots: ScheduleSlotInput[],
  sectionId: string,
  input: SchedulerInput,
  labels: import("./errors").SchedulerLabels,
): string[] {
  const state: SearchState = {
    slots,
    teacherBusy: new Map(),
    classBusy: new Map(),
    teacherWeeklyCount: new Map(),
    assignmentPlaced: input.assignments.map(() => 0),
  };
  return validateSectionQuality(sectionId, state, input, labels);
}

export {
  countSameSubjectOnDay,
  longestConsecutiveSameSubject,
  violatesQualityRules,
};
