"use server";

import { z } from "zod";
import { withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { enqueueScheduleGeneration } from "@/lib/scheduler/generate";
import { validateSlotConflict } from "@/lib/scheduler/solver";

const constraintSchema = z.object({
  teacherId: z.string().uuid().optional(),
  minFreePeriods: z.number().min(0),
  maxFreePeriods: z.number().min(0),
});

export async function upsertScheduleConstraintAction(input: z.infer<typeof constraintSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const data = constraintSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const existing = await tx.scheduleConstraint.findFirst({
      where: { schoolId: ctx.schoolId, teacherId: data.teacherId ?? null },
    });

    if (existing) {
      return tx.scheduleConstraint.update({
        where: { id: existing.id },
        data: { minFreePeriods: data.minFreePeriods, maxFreePeriods: data.maxFreePeriods },
      });
    }

    return tx.scheduleConstraint.create({
      data: { schoolId: ctx.schoolId, ...data },
    });
  });
}

const periodSchema = z.object({
  periodNo: z.number().min(1),
  startTime: z.string(),
  endTime: z.string(),
});

export async function upsertPeriodTimingAction(input: z.infer<typeof periodSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const data = periodSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.periodTiming.upsert({
      where: { schoolId_periodNo: { schoolId: ctx.schoolId, periodNo: data.periodNo } },
      create: { schoolId: ctx.schoolId, ...data },
      update: { startTime: data.startTime, endTime: data.endTime },
    });
  });
}

export async function generateScheduleAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  await enqueueScheduleGeneration(ctx.schoolId);
  return { queued: true };
}

export async function getActiveScheduleAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    const version = await tx.scheduleVersion.findFirst({
      where: { schoolId: ctx.schoolId, isActive: true },
      include: {
        scheduleSlots: {
          include: {
            classSection: true,
            subject: true,
          },
        },
      },
    });
    return version;
  });
}

export async function listScheduleVersionsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.scheduleVersion.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: { version: "desc" },
      include: { _count: { select: { scheduleSlots: true } } },
    });
  });
}

const slotEditSchema = z.object({
  slotId: z.string().uuid(),
  teacherId: z.string().uuid(),
  classSectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  periodNo: z.number().min(1),
});

export async function updateScheduleSlotAction(input: z.infer<typeof slotEditSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const data = slotEditSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const version = await tx.scheduleVersion.findFirst({
      where: { schoolId: ctx.schoolId, isActive: true },
      include: { scheduleSlots: true },
    });
    if (!version) throw new Error("No active schedule");

    const otherSlots = version.scheduleSlots
      .filter((s) => s.id !== data.slotId)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        periodNo: s.periodNo,
        teacherId: s.teacherId,
        classSectionId: s.classSectionId,
        subjectId: s.subjectId,
      }));

    const conflict = validateSlotConflict(otherSlots, {
      dayOfWeek: data.dayOfWeek,
      periodNo: data.periodNo,
      teacherId: data.teacherId,
      classSectionId: data.classSectionId,
      subjectId: data.subjectId,
    });

    if (conflict) throw new Error(conflict);

    return tx.scheduleSlot.update({
      where: { id: data.slotId },
      data: {
        teacherId: data.teacherId,
        classSectionId: data.classSectionId,
        subjectId: data.subjectId,
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
      },
    });
  });
}

export async function listTeacherAssignmentsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.teacherAssignment.findMany({
      include: { teacher: true, classSection: true, subject: true },
    });
  });
}

export async function listPeriodTimingsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.periodTiming.findMany({ orderBy: { periodNo: "asc" } });
  });
}

export async function listScheduleConstraintsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.scheduleConstraint.findMany();
  });
}
