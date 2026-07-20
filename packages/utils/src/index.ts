/** Format a Date as YYYY-MM-DD in UTC (attendance / grade dates). */
export function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Start-of-day UTC for comparing date-only fields. */
export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
