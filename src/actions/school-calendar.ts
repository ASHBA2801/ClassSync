"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenantContext } from "@/lib/db/prisma";
import { requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  buildMonthCalendar,
  getMonthBounds,
  isTemplateWorkingDay,
  parseIsoDate,
  resolveDayWorkingStatus,
} from "@/lib/calendar/working-days";

const monthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

const dateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function getWeekdayTemplate(
  tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
  schoolId: string,
) {
  const config = await tx.schoolScheduleConfig.findUnique({ where: { schoolId } });
  return config?.workingDays ?? [0, 1, 2, 3, 4];
}

export async function getCalendarMonthAction(year: number, month: number) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const data = monthSchema.parse({ year, month });

  return withTenantContext(ctx.schoolId, async (tx) => {
    const weekdayTemplate = await getWeekdayTemplate(tx, ctx.schoolId);
    const { start, end } = getMonthBounds(data.year, data.month);

    const rows = await tx.schoolCalendarDay.findMany({
      where: {
        schoolId: ctx.schoolId,
        date: { gte: start, lte: end },
      },
    });

    const overrides = new Map(
      rows.map((row) => [
        row.date.toISOString().slice(0, 10),
        { isWorkingDay: row.isWorkingDay, note: row.note },
      ]),
    );

    return {
      year: data.year,
      month: data.month,
      weekdayTemplate,
      days: buildMonthCalendar(data.year, data.month, weekdayTemplate, overrides),
    };
  });
}

export async function setCalendarDayStatusAction(date: string, isWorkingDay: boolean) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const { date: isoDate } = dateSchema.parse({ date });
  const parsed = parseIsoDate(isoDate);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const school = await tx.school.findUnique({
      where: { id: ctx.schoolId },
      select: { id: true },
    });
    if (!school) {
      throw new Error("School context is no longer valid. Please sign out and sign in again.");
    }

    await tx.schoolCalendarDay.upsert({
      where: { schoolId_date: { schoolId: ctx.schoolId, date: parsed } },
      create: {
        schoolId: ctx.schoolId,
        date: parsed,
        isWorkingDay,
      },
      update: { isWorkingDay },
    });
  });

  revalidatePath("/admin/calendar");
  return { success: true };
}

export async function toggleCalendarDayAction(date: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const { date: isoDate } = dateSchema.parse({ date });
  const parsed = parseIsoDate(isoDate);

  await withTenantContext(ctx.schoolId, async (tx) => {
    const school = await tx.school.findUnique({
      where: { id: ctx.schoolId },
      select: { id: true },
    });
    if (!school) {
      throw new Error("School context is no longer valid. Please sign out and sign in again.");
    }

    const weekdayTemplate = await getWeekdayTemplate(tx, ctx.schoolId);
    const existing = await tx.schoolCalendarDay.findUnique({
      where: { schoolId_date: { schoolId: ctx.schoolId, date: parsed } },
    });

    const currentStatus = existing
      ? existing.isWorkingDay
      : isTemplateWorkingDay(parsed, weekdayTemplate);

    await tx.schoolCalendarDay.upsert({
      where: { schoolId_date: { schoolId: ctx.schoolId, date: parsed } },
      create: {
        schoolId: ctx.schoolId,
        date: parsed,
        isWorkingDay: !currentStatus,
      },
      update: {
        isWorkingDay: !currentStatus,
      },
    });
  });

  revalidatePath("/admin/calendar");
  return { success: true };
}

export async function applyWeekdayTemplateToMonthAction(year: number, month: number) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const data = monthSchema.parse({ year, month });

  await withTenantContext(ctx.schoolId, async (tx) => {
    const { start, end } = getMonthBounds(data.year, data.month);
    await tx.schoolCalendarDay.deleteMany({
      where: {
        schoolId: ctx.schoolId,
        date: { gte: start, lte: end },
      },
    });
  });

  revalidatePath("/admin/calendar");
  return { success: true };
}

export async function resetCalendarDayToTemplateAction(date: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const { date: isoDate } = dateSchema.parse({ date });
  const parsed = parseIsoDate(isoDate);

  await withTenantContext(ctx.schoolId, async (tx) => {
    await tx.schoolCalendarDay.deleteMany({
      where: { schoolId: ctx.schoolId, date: parsed },
    });
  });

  revalidatePath("/admin/calendar");
  return { success: true };
}

export async function getResolvedWorkingDayStatusAction(date: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.PAYROLL_MANAGE);
  const { date: isoDate } = dateSchema.parse({ date });
  const parsed = parseIsoDate(isoDate);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const weekdayTemplate = await getWeekdayTemplate(tx, ctx.schoolId);
    const existing = await tx.schoolCalendarDay.findUnique({
      where: { schoolId_date: { schoolId: ctx.schoolId, date: parsed } },
    });
    const overrides = new Map(
      existing
        ? [[isoDate, { isWorkingDay: existing.isWorkingDay, note: existing.note }]]
        : [],
    );
    return resolveDayWorkingStatus(parsed, weekdayTemplate, overrides);
  });
}
