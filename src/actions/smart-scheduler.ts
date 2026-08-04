"use server";

import { z } from "zod";
import { withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { ForbiddenError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createAuditLog } from "@/lib/audit";
import {
  applyLeaveSubstitutions,
  cancelLeaveAlterations,
  incrementAlterationStats,
  resolveEffectiveSlots,
  startOfDay,
  validateAlterationConflict,
} from "@/lib/scheduler/smart-scheduler";
import {
  cancelSwapGroup,
  createComplementarySwap,
  createParallelSectionSwap,
  findParallelSectionPairs,
  listActiveSwapGroups,
} from "@/lib/scheduler/swap";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function getEffectiveScheduleAction(dateStr: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_VIEW);
  const date = startOfDay(new Date(dateStr));

  return withTenantContext(ctx.schoolId, async (tx) => {
    const slots = await resolveEffectiveSlots(ctx.schoolId, date, tx);
    const teachers = await tx.user.findMany({
      where: {
        id: {
          in: [
            ...new Set(
              slots.flatMap((s) => [s.teacherId, s.originalTeacherId].filter(Boolean) as string[]),
            ),
          ],
        },
      },
      select: { id: true, name: true },
    });
    const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t.name]));
    return { date: dateStr, slots, teacherMap };
  });
}

export async function listAlterationsAction(filters?: {
  date?: string;
  teacherId?: string;
  status?: "ACTIVE" | "CANCELLED";
}) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_ALTER);
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.scheduleAlteration.findMany({
      where: {
        schoolId: ctx.schoolId,
        ...(filters?.date ? { date: startOfDay(new Date(filters.date)) } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.teacherId
          ? {
              OR: [
                { originalTeacherId: filters.teacherId },
                { substituteTeacherId: filters.teacherId },
              ],
            }
          : {}),
      },
      include: {
        classSection: true,
        subject: true,
        leaveRequest: true,
        swapGroup: true,
      },
      orderBy: [{ date: "desc" }, { periodNo: "asc" }],
    });
  });
}

export async function listMyAlterationsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_VIEW);
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.scheduleAlteration.findMany({
      where: {
        schoolId: ctx.schoolId,
        status: "ACTIVE",
        OR: [
          { originalTeacherId: ctx.userId },
          { substituteTeacherId: ctx.userId },
        ],
      },
      include: { classSection: true, subject: true },
      orderBy: [{ date: "asc" }, { periodNo: "asc" }],
    });
  });
}

const complementarySwapSchema = z.object({
  teacherAId: z.string().uuid(),
  teacherBId: z.string().uuid(),
  dateA: dateSchema,
  periodA: z.number().min(1),
  dateB: dateSchema,
  periodB: z.number().min(1),
  note: z.string().optional(),
});

export async function createComplementarySwapAction(input: z.infer<typeof complementarySwapSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_SWAP);
  const data = complementarySwapSchema.parse(input);

  if (ctx.role === "TEACHER" && ctx.userId !== data.teacherAId && ctx.userId !== data.teacherBId) {
    throw new Error("Teachers can only create swaps involving themselves");
  }

  const group = await createComplementarySwap({
    schoolId: ctx.schoolId,
    teacherAId: data.teacherAId,
    teacherBId: data.teacherBId,
    dateA: startOfDay(new Date(data.dateA)),
    periodA: data.periodA,
    dateB: startOfDay(new Date(data.dateB)),
    periodB: data.periodB,
    createdBy: ctx.userId,
    note: data.note,
  });

  await createAuditLog({
    actorId: ctx.userId,
    schoolId: ctx.schoolId,
    action: "schedule.swap_complementary",
    entityType: "ScheduleSwapGroup",
    entityId: group.id,
  });

  return group;
}

const parallelSwapSchema = z.object({
  teacherAId: z.string().uuid(),
  teacherBId: z.string().uuid(),
  date: dateSchema,
  note: z.string().optional(),
});

export async function createParallelSwapAction(input: z.infer<typeof parallelSwapSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_SWAP);
  const data = parallelSwapSchema.parse(input);

  if (ctx.role === "TEACHER" && ctx.userId !== data.teacherAId && ctx.userId !== data.teacherBId) {
    throw new Error("Teachers can only create swaps involving themselves");
  }

  const result = await createParallelSectionSwap({
    schoolId: ctx.schoolId,
    teacherAId: data.teacherAId,
    teacherBId: data.teacherBId,
    date: startOfDay(new Date(data.date)),
    createdBy: ctx.userId,
    note: data.note,
  });

  await createAuditLog({
    actorId: ctx.userId,
    schoolId: ctx.schoolId,
    action: "schedule.swap_parallel",
    entityType: "ScheduleSwapGroup",
    entityId: result.group.id,
    metadata: { swapCount: result.swapCount },
  });

  return result;
}

export async function cancelSwapGroupAction(swapGroupId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_SWAP);

  const group = await withTenantContext(ctx.schoolId, async (tx) => {
    return tx.scheduleSwapGroup.findFirst({
      where: { id: swapGroupId, schoolId: ctx.schoolId },
    });
  });
  if (!group) throw new Error("Swap group not found");

  if (
    ctx.role === "TEACHER" &&
    ctx.userId !== group.teacherAId &&
    ctx.userId !== group.teacherBId
  ) {
    throw new Error("Teachers can only cancel their own swaps");
  }

  const count = await cancelSwapGroup(swapGroupId);
  await createAuditLog({
    actorId: ctx.userId,
    schoolId: ctx.schoolId,
    action: "schedule.swap_cancelled",
    entityType: "ScheduleSwapGroup",
    entityId: swapGroupId,
    metadata: { alterationCount: count },
  });
  return { cancelled: count };
}

export async function listSwapGroupsAction() {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_SWAP);
  const teacherId = ctx.role === "TEACHER" ? ctx.userId : undefined;
  return listActiveSwapGroups(ctx.schoolId, teacherId);
}

export async function getParallelPairsAction(teacherAId: string, teacherBId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_SWAP);
  if (ctx.role === "TEACHER" && ctx.userId !== teacherAId && ctx.userId !== teacherBId) {
    throw new Error("Teachers can only view swaps involving themselves");
  }
  return findParallelSectionPairs(ctx.schoolId, teacherAId, teacherBId);
}

const overrideSchema = z.object({
  date: dateSchema,
  periodNo: z.number().min(1),
  classSectionId: z.string().uuid(),
  substituteTeacherId: z.string().uuid(),
});

export async function overrideSubstitutionAction(input: z.infer<typeof overrideSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_ALTER);
  const data = overrideSchema.parse(input);
  const date = startOfDay(new Date(data.date));

  return withTenantContext(ctx.schoolId, async (tx) => {
    const existing = await tx.scheduleAlteration.findFirst({
      where: {
        schoolId: ctx.schoolId,
        date,
        periodNo: data.periodNo,
        classSectionId: data.classSectionId,
        status: "ACTIVE",
      },
    });

    const effective = await resolveEffectiveSlots(ctx.schoolId, date, tx);
    const slot = effective.find(
      (s) => s.periodNo === data.periodNo && s.classSectionId === data.classSectionId,
    );
    if (!slot) throw new Error("No schedule slot found for this period and class");

    const conflict = await validateAlterationConflict(
      ctx.schoolId,
      date,
      data.periodNo,
      data.substituteTeacherId,
      data.classSectionId,
      existing?.id,
      tx,
    );
    if (conflict) throw new Error(conflict);

    if (existing) {
      await tx.scheduleAlteration.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
      });
      await decrementAlterationStatsInternal(tx, ctx.schoolId, existing);
    }

    const originalTeacherId = slot.originalTeacherId ?? slot.teacherId;
    const alteration = await tx.scheduleAlteration.create({
      data: {
        schoolId: ctx.schoolId,
        date,
        periodNo: data.periodNo,
        classSectionId: data.classSectionId,
        subjectId: slot.subjectId,
        originalTeacherId,
        substituteTeacherId: data.substituteTeacherId,
        type: "ADMIN_OVERRIDE",
        leaveRequestId: existing?.leaveRequestId,
        createdBy: ctx.userId,
      },
    });

    await incrementAlterationStats(ctx.schoolId, data.substituteTeacherId, originalTeacherId, tx);

    return alteration;
  });
}

async function decrementAlterationStatsInternal(
  tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
  schoolId: string,
  alt: { substituteTeacherId: string; originalTeacherId: string },
) {
  const { decrementAlterationStats } = await import("@/lib/scheduler/smart-scheduler");
  await decrementAlterationStats(schoolId, alt.substituteTeacherId, alt.originalTeacherId, tx);
}

export async function cancelAlterationAction(alterationId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_ALTER);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const alt = await tx.scheduleAlteration.findFirst({
      where: { id: alterationId, schoolId: ctx.schoolId, status: "ACTIVE" },
    });
    if (!alt) throw new Error("Alteration not found");

    await tx.scheduleAlteration.update({
      where: { id: alt.id },
      data: { status: "CANCELLED" },
    });
    await decrementAlterationStatsInternal(tx, ctx.schoolId, alt);
    return alt;
  });
}

export async function getTeacherAlterationStatsAction(teacherId?: string) {
  const ctx = await requireSchoolContext();
  const targetId = teacherId ?? ctx.userId;

  if (ctx.role === "TEACHER" && targetId !== ctx.userId) {
    throw new Error("Teachers can only view their own stats");
  }

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.teacherAlterationStat.findUnique({
      where: { schoolId_teacherId: { schoolId: ctx.schoolId, teacherId: targetId } },
    });
  });
}

export async function listSchoolTeachersAction() {
  const ctx = await requireSchoolContext();
  const allowed = [
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.SCHEDULE_ALTER,
    PERMISSIONS.SCHEDULE_SWAP,
  ];
  if (!allowed.some((p) => ctx.permissions.includes(p))) {
    throw new ForbiddenError(`Missing permission: one of ${allowed.join(", ")}`);
  }
  return withTenantContext(ctx.schoolId, async (tx) => {
    const memberships = await tx.userSchoolMembership.findMany({
      where: { schoolId: ctx.schoolId, role: "TEACHER", isActive: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return memberships.map((m) => m.user);
  });
}

export async function reapplyLeaveSubstitutionsAction(leaveRequestId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHEDULE_ALTER);
  await cancelLeaveAlterations(leaveRequestId);
  return applyLeaveSubstitutions(leaveRequestId, ctx.userId);
}
