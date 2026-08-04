"use server";

import { z } from "zod";
import { withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createAuditLog } from "@/lib/audit";
import { enqueueScheduleGeneration, generateScheduleForSchool } from "@/lib/scheduler/generate";
import { evaluateScheduleReadiness } from "@/lib/scheduler/readiness";
import { validateSlotConflict } from "@/lib/scheduler/solver";

const constraintSchema = z
  .object({
    teacherId: z.string().uuid().optional(),
    minFreePerDay: z.number().min(0),
    maxFreePerDay: z.number().min(0),
    minFreePerWeek: z.number().min(0),
    maxFreePerWeek: z.number().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.minFreePerDay > data.maxFreePerDay) {
      ctx.addIssue({
        code: "custom",
        message: "Min free periods per day cannot exceed max",
        path: ["minFreePerDay"],
      });
    }
    if (data.minFreePerWeek > data.maxFreePerWeek) {
      ctx.addIssue({
        code: "custom",
        message: "Min free periods per week cannot exceed max",
        path: ["minFreePerWeek"],
      });
    }
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
        data: {
          minFreePerDay: data.minFreePerDay,
          maxFreePerDay: data.maxFreePerDay,
          minFreePerWeek: data.minFreePerWeek,
          maxFreePerWeek: data.maxFreePerWeek,
        },
      });
    }

    return tx.scheduleConstraint.create({
      data: {
        schoolId: ctx.schoolId,
        teacherId: data.teacherId ?? null,
        minFreePerDay: data.minFreePerDay,
        maxFreePerDay: data.maxFreePerDay,
        minFreePerWeek: data.minFreePerWeek,
        maxFreePerWeek: data.maxFreePerWeek,
      },
    });
  });
}

export async function deleteScheduleConstraintAction(constraintId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const constraint = await tx.scheduleConstraint.findFirst({
      where: { id: constraintId, schoolId: ctx.schoolId },
    });
    if (!constraint) throw new Error("Constraint not found");
    if (constraint.teacherId === null) {
      throw new Error("Cannot delete global constraint — update it instead");
    }

    return tx.scheduleConstraint.delete({ where: { id: constraintId } });
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

export async function deletePeriodTimingAction(periodNo: number) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.periodTiming.delete({
      where: { schoolId_periodNo: { schoolId: ctx.schoolId, periodNo } },
    });
  });
}

export async function getScheduleSetupStatusAction() {
  const ctx = await requireSchoolContext();
  return evaluateScheduleReadiness(ctx.schoolId);
}

export async function generateScheduleAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);

  const readiness = await evaluateScheduleReadiness(ctx.schoolId);
  if (!readiness.isReady) {
    const failedChecks = readiness.checks.filter((c) => !c.passed);
    return {
      success: false as const,
      error: "Setup incomplete",
      checks: failedChecks,
    };
  }

  const result = await generateScheduleForSchool(ctx.schoolId);

  if (result.success) {
    await createAuditLog({
      actorId: ctx.userId,
      schoolId: ctx.schoolId,
      action: "schedule.generate_success",
      entityType: "ScheduleVersion",
      entityId: result.versionId,
      metadata: { slotCount: result.slotCount, summary: readiness.summary },
    });

    return {
      success: true as const,
      versionId: result.versionId,
      slotCount: result.slotCount,
    };
  }

  await createAuditLog({
    actorId: ctx.userId,
    schoolId: ctx.schoolId,
    action: "schedule.generate_failed",
    entityType: "ScheduleVersion",
    metadata: { errors: result.errors },
  });

  return {
    success: false as const,
    error: "Generation failed",
    errors: result.errors,
  };
}

/** Queue generation for background processing (requires `npm run worker`). */
export async function queueScheduleGenerationAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);

  const readiness = await evaluateScheduleReadiness(ctx.schoolId);
  if (!readiness.isReady) {
    const failedChecks = readiness.checks.filter((c) => !c.passed);
    return {
      queued: false as const,
      error: "Setup incomplete",
      checks: failedChecks,
    };
  }

  await enqueueScheduleGeneration(ctx.schoolId);

  await createAuditLog({
    actorId: ctx.userId,
    schoolId: ctx.schoolId,
    action: "schedule.generate_queued",
    entityType: "ScheduleVersion",
    metadata: { summary: readiness.summary },
  });

  return { queued: true as const };
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

export async function previewScheduleEditAction(input: z.infer<typeof slotEditSchema>) {
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

    return { hasConflict: !!conflict, conflictMessage: conflict };
  });
}

const temporaryOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodNo: z.number().min(1),
  classSectionId: z.string().uuid(),
  substituteTeacherId: z.string().uuid(),
});

export async function applyTemporaryOverrideAction(input: z.infer<typeof temporaryOverrideSchema>) {
  const { overrideSubstitutionAction } = await import("@/actions/smart-scheduler");
  return overrideSubstitutionAction(input);
}

export async function regenerateScheduleForTeachersAction(_teacherIds: string[]) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);

  const result = await generateScheduleForSchool(ctx.schoolId);

  if (result.success) {
    await createAuditLog({
      actorId: ctx.userId,
      schoolId: ctx.schoolId,
      action: "schedule.regenerate_for_teachers",
      entityType: "ScheduleVersion",
      entityId: result.versionId,
      metadata: { slotCount: result.slotCount },
    });
    return { success: true as const, versionId: result.versionId, slotCount: result.slotCount };
  }

  return { success: false as const, errors: result.errors };
}

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
    return tx.scheduleConstraint.findMany({
      orderBy: [{ teacherId: "asc" }],
    });
  });
}

export async function getSchoolScheduleConfigAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.schoolScheduleConfig.findUnique({ where: { schoolId: ctx.schoolId } });
  });
}

const scheduleConfigSchema = z.object({
  daysPerWeek: z.number().min(1).max(7),
  workingDays: z.array(z.number().min(0).max(6)),
});

export async function upsertSchoolScheduleConfigAction(input: z.infer<typeof scheduleConfigSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_MANAGE);
  const data = scheduleConfigSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.schoolScheduleConfig.upsert({
      where: { schoolId: ctx.schoolId },
      create: { schoolId: ctx.schoolId, ...data },
      update: data,
    });
  });
}
