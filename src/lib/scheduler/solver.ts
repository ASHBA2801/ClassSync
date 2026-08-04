import {
  formatAssignmentError,
  formatTeacherConstraintErrors,
  summarizeSchedulerErrors,
} from "./errors";

export interface ScheduleAssignment {
  teacherId: string;
  classSectionId: string;
  subjectId: string;
  periodsPerWeek: number;
}

export interface ScheduleConstraintConfig {
  teacherId?: string;
  minFreePerDay: number;
  maxFreePerDay: number;
  minFreePerWeek: number;
  maxFreePerWeek: number;
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
  workingDays: number[];
  periodsPerDay: number;
  assignments: ScheduleAssignment[];
  constraints: ScheduleConstraintConfig[];
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
  teacherDailyCount: Map<string, Map<number, number>>;
  teacherWeeklyCount: Map<string, number>;
  assignmentPlaced: number[];
}

const SOLVER_TIMEOUT_MS = 30_000;

function slotKey(day: number, period: number) {
  return `${day}-${period}`;
}

function getConstraint(teacherId: string, constraints: ScheduleConstraintConfig[]) {
  return (
    constraints.find((c) => c.teacherId === teacherId) ??
    constraints.find((c) => !c.teacherId) ?? {
      minFreePerDay: 0,
      maxFreePerDay: 3,
      minFreePerWeek: 1,
      maxFreePerWeek: 10,
    }
  );
}

function expandToTokens(assignments: ScheduleAssignment[]): PeriodToken[] {
  const tokens: PeriodToken[] = [];
  assignments.forEach((assignment, assignmentIndex) => {
    for (let i = 0; i < assignment.periodsPerWeek; i++) {
      tokens.push({
        assignmentIndex,
        teacherId: assignment.teacherId,
        classSectionId: assignment.classSectionId,
        subjectId: assignment.subjectId,
      });
    }
  });
  return tokens;
}

function createInitialState(assignments: ScheduleAssignment[]): SearchState {
  return {
    slots: [],
    teacherBusy: new Map(),
    classBusy: new Map(),
    teacherDailyCount: new Map(),
    teacherWeeklyCount: new Map(),
    assignmentPlaced: assignments.map(() => 0),
  };
}

function getTeacherDailyCount(state: SearchState, teacherId: string, day: number): number {
  return state.teacherDailyCount.get(teacherId)?.get(day) ?? 0;
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

  const constraint = getConstraint(token.teacherId, input.constraints);
  const dailyBusy = getTeacherDailyCount(state, token.teacherId, day);
  const weeklyBusy = state.teacherWeeklyCount.get(token.teacherId) ?? 0;

  const dailyFreeAfterAllPlaced = input.periodsPerDay - dailyBusy - 1;
  if (dailyFreeAfterAllPlaced < constraint.minFreePerDay) return false;

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

  const dailyMap = state.teacherDailyCount.get(token.teacherId) ?? new Map();
  dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  state.teacherDailyCount.set(token.teacherId, dailyMap);

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

  const dailyMap = state.teacherDailyCount.get(token.teacherId);
  if (dailyMap) {
    const count = (dailyMap.get(day) ?? 1) - 1;
    if (count <= 0) dailyMap.delete(day);
    else dailyMap.set(day, count);
  }

  state.teacherWeeklyCount.set(
    token.teacherId,
    (state.teacherWeeklyCount.get(token.teacherId) ?? 1) - 1,
  );

  state.assignmentPlaced[token.assignmentIndex]--;
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
    const dailyBusy = state.teacherDailyCount.get(teacherId) ?? new Map();
    const weeklyBusy = state.teacherWeeklyCount.get(teacherId) ?? 0;
    errors.push(
      ...formatTeacherConstraintErrors(teacherId, input, labels, weeklyBusy, dailyBusy),
    );
  }

  return errors;
}

function sortTokensByMRV(tokens: PeriodToken[], input: SchedulerInput): PeriodToken[] {
  const teacherLoad = new Map<string, number>();
  for (const a of input.assignments) {
    teacherLoad.set(a.teacherId, (teacherLoad.get(a.teacherId) ?? 0) + a.periodsPerWeek);
  }

  return [...tokens].sort((a, b) => {
    const loadA = teacherLoad.get(a.teacherId) ?? 0;
    const loadB = teacherLoad.get(b.teacherId) ?? 0;
    if (loadB !== loadA) return loadB - loadA;
    if (a.teacherId !== b.teacherId) return a.teacherId.localeCompare(b.teacherId);
    return a.classSectionId.localeCompare(b.classSectionId);
  });
}

function backtrack(
  tokenIndex: number,
  tokens: PeriodToken[],
  state: SearchState,
  input: SchedulerInput,
  deadline: number,
): boolean {
  if (Date.now() > deadline) return false;

  if (tokenIndex >= tokens.length) {
    const errors = validateFinalState(state, input);
    return errors.length === 0;
  }

  const token = tokens[tokenIndex];
  const days = input.workingDays.slice(0, input.daysPerWeek);

  for (const day of days) {
    for (let period = 1; period <= input.periodsPerDay; period++) {
      if (!canPlace(token, day, period, state, input)) continue;

      applyPlacement(token, day, period, state);
      if (backtrack(tokenIndex + 1, tokens, state, input, deadline)) {
        return true;
      }
      undoPlacement(token, day, period, state);
    }
  }

  return false;
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
        { minFreePerDay: 0, maxFreePerDay: 3, minFreePerWeek: 1, maxFreePerWeek: 10 },
      ],
    };
  }

  const tokens = sortTokensByMRV(expandToTokens(assignments), input);
  const state = createInitialState(assignments);
  const deadline = Date.now() + SOLVER_TIMEOUT_MS;

  const solved = backtrack(0, tokens, state, input, deadline);

  if (!solved) {
    const validationErrors = validateFinalState(state, input);
    if (validationErrors.length > 0) {
      errors.push(...summarizeSchedulerErrors(validationErrors));
    } else if (Date.now() > deadline) {
      errors.push(
        "Schedule generation timed out — try relaxing free-period rules or reducing subject hours.",
      );
    } else {
      errors.push(
        "Could not find a valid timetable with the current assignments and free-period rules. Review the suggestions below.",
      );
    }
    return { success: false, slots: state.slots, errors };
  }

  return { success: true, slots: state.slots, errors: [] };
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
  workingDays: number[] = [0, 1, 2, 3, 4],
): string | null {
  const teacherSlots = slots.filter((s) => s.teacherId === teacherId);
  const weeklyBusy = teacherSlots.length;
  const totalSlots = daysPerWeek * periodsPerDay;
  const weeklyFree = totalSlots - weeklyBusy;

  if (weeklyFree < constraint.minFreePerWeek || weeklyFree > constraint.maxFreePerWeek) {
    return `Teacher free periods per week (${weeklyFree}) outside allowed range [${constraint.minFreePerWeek}, ${constraint.maxFreePerWeek}]`;
  }

  for (const day of workingDays.slice(0, daysPerWeek)) {
    const dailyBusy = teacherSlots.filter((s) => s.dayOfWeek === day).length;
    const dailyFree = periodsPerDay - dailyBusy;
    if (dailyFree < constraint.minFreePerDay || dailyFree > constraint.maxFreePerDay) {
      return `Teacher free periods on day ${day} (${dailyFree}) outside allowed range [${constraint.minFreePerDay}, ${constraint.maxFreePerDay}]`;
    }
  }

  return null;
}
