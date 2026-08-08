import { dateToDayOfWeek } from "@/lib/scheduler/day-of-week";

export type CalendarDayEntry = {
  date: string;
  isWorkingDay: boolean;
  isOverride: boolean;
  note: string | null;
};

export function dateToIsoKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

export function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function isTemplateWorkingDay(date: Date, weekdayTemplate: number[]): boolean {
  return weekdayTemplate.includes(dateToDayOfWeek(date));
}

export function resolveDayWorkingStatus(
  date: Date,
  weekdayTemplate: number[],
  overrides: Map<string, { isWorkingDay: boolean; note: string | null }>,
): CalendarDayEntry {
  const key = dateToIsoKey(date);
  const override = overrides.get(key);
  if (override) {
    return {
      date: key,
      isWorkingDay: override.isWorkingDay,
      isOverride: true,
      note: override.note,
    };
  }
  return {
    date: key,
    isWorkingDay: isTemplateWorkingDay(date, weekdayTemplate),
    isOverride: false,
    note: null,
  };
}

export function formatCalendarDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateKeyFromLocalDate(date: Date): string {
  return formatCalendarDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export type MonthGridCell = CalendarDayEntry & {
  dayNumber: number;
  inCurrentMonth: boolean;
};

export function buildMonthGrid(
  year: number,
  month: number,
  days: CalendarDayEntry[],
  weekdayTemplate: number[],
): MonthGridCell[] {
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const { start: monthStart, end: monthEnd } = getMonthBounds(year, month);
  const leadingDays = dateToDayOfWeek(monthStart);
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(gridStart.getUTCDate() - leadingDays);

  const cells: MonthGridCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart);
    current.setUTCDate(gridStart.getUTCDate() + index);
    const key = dateToIsoKey(current);
    const inCurrentMonth = current >= monthStart && current <= monthEnd;
    const existing = dayMap.get(key);

    if (existing) {
      cells.push({
        ...existing,
        dayNumber: current.getUTCDate(),
        inCurrentMonth,
      });
      continue;
    }

    cells.push({
      date: key,
      isWorkingDay: isTemplateWorkingDay(current, weekdayTemplate),
      isOverride: false,
      note: null,
      dayNumber: current.getUTCDate(),
      inCurrentMonth,
    });
  }

  return cells;
}

export function buildMonthCalendar(
  year: number,
  month: number,
  weekdayTemplate: number[],
  overrides: Map<string, { isWorkingDay: boolean; note: string | null }>,
): CalendarDayEntry[] {
  const { start, end } = getMonthBounds(year, month);
  return eachDateInRange(start, end).map((date) =>
    resolveDayWorkingStatus(date, weekdayTemplate, overrides),
  );
}

export function resolveWorkingDayKeys(
  periodStart: Date,
  periodEnd: Date,
  weekdayTemplate: number[],
  overrides: Map<string, { isWorkingDay: boolean; note: string | null }>,
): string[] {
  return eachDateInRange(periodStart, periodEnd)
    .filter((date) => resolveDayWorkingStatus(date, weekdayTemplate, overrides).isWorkingDay)
    .map((date) => dateToIsoKey(date));
}

export function expandLeaveToDateKeys(startDate: Date, endDate: Date): string[] {
  return eachDateInRange(startDate, endDate).map((date) => dateToIsoKey(date));
}

export function subtractOdDates(absentKeys: string[], odLeaveRanges: { startDate: Date; endDate: Date }[]): string[] {
  const odKeys = new Set<string>();
  for (const range of odLeaveRanges) {
    for (const key of expandLeaveToDateKeys(range.startDate, range.endDate)) {
      odKeys.add(key);
    }
  }
  return absentKeys.filter((key) => !odKeys.has(key));
}

export function computeDeductibleAbsentDays(input: {
  absentKeysInPeriod: string[];
  minimumLeaves: number;
  leaveAllowancePeriod: "MONTH" | "YEAR";
  periodStart: Date;
  periodEnd: Date;
  ytdAbsentKeys?: string[];
}): number {
  const { absentKeysInPeriod, minimumLeaves, leaveAllowancePeriod, periodStart, periodEnd, ytdAbsentKeys } =
    input;

  if (leaveAllowancePeriod === "MONTH") {
    return Math.max(0, absentKeysInPeriod.length - minimumLeaves);
  }

  const ytdAbsent = ytdAbsentKeys ?? absentKeysInPeriod;
  const yearStart = new Date(Date.UTC(periodStart.getUTCFullYear(), 0, 1));
  const dayBeforePeriod = new Date(periodStart);
  dayBeforePeriod.setUTCDate(dayBeforePeriod.getUTCDate() - 1);

  const ytdBeforePeriod =
    dayBeforePeriod >= yearStart
      ? ytdAbsent.filter((key) => {
          const date = parseIsoDate(key);
          return date >= yearStart && date <= dayBeforePeriod;
        })
      : [];

  const priorCharged = Math.max(0, ytdBeforePeriod.length - minimumLeaves);
  const totalExcess = Math.max(0, ytdAbsent.length - minimumLeaves);
  return Math.max(0, totalExcess - priorCharged);
}
