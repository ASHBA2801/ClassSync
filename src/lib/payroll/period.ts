export function getMonthPeriodBounds(year: number, month: number): { periodStart: Date; periodEnd: Date } {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0));
  return { periodStart, periodEnd };
}

export function getPreviousCalendarMonth(reference = new Date()): { year: number; month: number } {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth(); // 0-indexed current month
  if (month === 0) return { year: year - 1, month: 12 };
  return { year, month };
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getLocalDateParts(date: Date, timezone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isPayrollRunDay(date: Date, timezone: string, payrollRunDay: number): boolean {
  const { year, month, day } = getLocalDateParts(date, timezone);
  if (payrollRunDay === 0) {
    return day === getDaysInMonth(year, month);
  }
  return day === payrollRunDay;
}

export function isFirstDayOfMonth(date: Date, timezone: string): boolean {
  return getLocalDateParts(date, timezone).day === 1;
}
