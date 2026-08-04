import type { PrismaClient, ScheduleAlterationType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { enqueueNotification } from "@/lib/notifications";
import { validateSlotConflict, type ScheduleSlotInput } from "@/lib/scheduler/solver";

export interface EffectiveSlot extends ScheduleSlotInput {
  id?: string;
  isAltered: boolean;
  originalTeacherId?: string;
  alterationId?: string;
  alterationType?: ScheduleAlterationType;
  priorityLevel?: number | null;
  leaveRequestId?: string | null;
  swapGroupId?: string | null;
  classSection?: { id: string; name: string; gradeId: string };
  subject?: { id: string; name: string };
}

export interface SubstituteResult {
  teacherId: string;
  priorityLevel: number;
}

export interface LeaveSubstitutionResult {
  alteredCount: number;
  uncoveredSlots: Array<{
    date: Date;
    periodNo: number;
    classSectionId: string;
    subjectId: string;
  }>;
}

type DbClient = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Monday = 0, Sunday = 6 */
export function dateToDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = startOfDay(start);
  const last = startOfDay(end);
  while (current <= last) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getActiveVersionSlots(schoolId: string, dayOfWeek: number, db: DbClient = prisma) {
  const version = await db.scheduleVersion.findFirst({
    where: { schoolId, isActive: true },
    include: {
      scheduleSlots: {
        where: { dayOfWeek },
        include: { classSection: true, subject: true },
      },
    },
  });
  return version;
}

async function getActiveAlterationsForDate(
  schoolId: string,
  date: Date,
  db: DbClient = prisma,
) {
  return db.scheduleAlteration.findMany({
    where: {
      schoolId,
      date: startOfDay(date),
      status: "ACTIVE",
    },
  });
}

async function getTeachersOnLeave(
  schoolId: string,
  date: Date,
  db: DbClient = prisma,
): Promise<Set<string>> {
  const d = startOfDay(date);
  const leaves = await db.leaveRequest.findMany({
    where: {
      schoolId,
      requesterType: "TEACHER",
      status: "APPROVED",
      startDate: { lte: d },
      endDate: { gte: d },
    },
    select: { requesterId: true },
  });
  return new Set(leaves.map((l) => l.requesterId));
}

async function getActiveTeacherIds(schoolId: string, db: DbClient = prisma): Promise<Set<string>> {
  const memberships = await db.userSchoolMembership.findMany({
    where: { schoolId, role: "TEACHER", isActive: true },
    select: { userId: true },
  });
  return new Set(memberships.map((m) => m.userId));
}

export async function isTeacherFree(
  schoolId: string,
  teacherId: string,
  date: Date,
  periodNo: number,
  excludeTeacherIds: Set<string> = new Set(),
  db: DbClient = prisma,
): Promise<boolean> {
  if (excludeTeacherIds.has(teacherId)) return false;

  const dayOfWeek = dateToDayOfWeek(date);
  const version = await getActiveVersionSlots(schoolId, dayOfWeek, db);
  if (!version) return false;

  const onLeave = await getTeachersOnLeave(schoolId, date, db);
  if (onLeave.has(teacherId)) return false;

  const baseBusy = version.scheduleSlots.some(
    (s) => s.teacherId === teacherId && s.periodNo === periodNo,
  );
  if (baseBusy) return false;

  const alterations = await getActiveAlterationsForDate(schoolId, date, db);
  const alteredBusy = alterations.some(
    (a) => a.substituteTeacherId === teacherId && a.periodNo === periodNo,
  );
  if (alteredBusy) return false;

  const activeTeachers = await getActiveTeacherIds(schoolId, db);
  return activeTeachers.has(teacherId);
}

export async function resolveEffectiveSlots(
  schoolId: string,
  date: Date,
  db: DbClient = prisma,
): Promise<EffectiveSlot[]> {
  const dayOfWeek = dateToDayOfWeek(date);
  const version = await getActiveVersionSlots(schoolId, dayOfWeek, db);
  if (!version) return [];

  const alterations = await getActiveAlterationsForDate(schoolId, date, db);
  const alterationBySection = new Map(
    alterations.map((a) => [`${a.periodNo}-${a.classSectionId}`, a]),
  );

  const effective: EffectiveSlot[] = version.scheduleSlots.map((slot) => {
    const key = `${slot.periodNo}-${slot.classSectionId}`;
    const alt = alterationBySection.get(key);
    if (alt) {
      return {
        dayOfWeek: slot.dayOfWeek,
        periodNo: slot.periodNo,
        teacherId: alt.substituteTeacherId,
        classSectionId: slot.classSectionId,
        subjectId: slot.subjectId,
        id: slot.id,
        isAltered: true,
        originalTeacherId: alt.originalTeacherId,
        alterationId: alt.id,
        alterationType: alt.type,
        priorityLevel: alt.priorityLevel,
        leaveRequestId: alt.leaveRequestId,
        swapGroupId: alt.swapGroupId,
        classSection: slot.classSection,
        subject: slot.subject,
      };
    }
    return {
      dayOfWeek: slot.dayOfWeek,
      periodNo: slot.periodNo,
      teacherId: slot.teacherId,
      classSectionId: slot.classSectionId,
      subjectId: slot.subjectId,
      id: slot.id,
      isAltered: false,
      classSection: slot.classSection,
      subject: slot.subject,
    };
  });

  const slotInputs: ScheduleSlotInput[] = effective.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    periodNo: s.periodNo,
    teacherId: s.teacherId,
    classSectionId: s.classSectionId,
    subjectId: s.subjectId,
  }));

  for (let i = 0; i < slotInputs.length; i++) {
    const conflict = validateSlotConflict(slotInputs, slotInputs[i], i);
    if (conflict) {
      console.warn(`[smart-scheduler] Effective schedule conflict on ${formatDateKey(date)}: ${conflict}`);
    }
  }

  return effective;
}

function pickBestCandidate(candidates: string[], stats: Map<string, number>): string | null {
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (stats.get(a) ?? 0) - (stats.get(b) ?? 0));
  return candidates[0];
}

export { pickBestCandidate };

export function mergeBaseSlotsWithAlterations<
  T extends {
    id: string;
    dayOfWeek: number;
    periodNo: number;
    teacherId: string;
    classSectionId: string;
    subjectId: string;
  },
  A extends {
    id: string;
    periodNo: number;
    classSectionId: string;
    originalTeacherId: string;
    substituteTeacherId: string;
  },
>(baseSlots: T[], alterations: A[]): Array<T & { isAltered: boolean; effectiveTeacherId: string }> {
  const alterationBySection = new Map(
    alterations.map((a) => [`${a.periodNo}-${a.classSectionId}`, a]),
  );

  return baseSlots.map((slot) => {
    const alt = alterationBySection.get(`${slot.periodNo}-${slot.classSectionId}`);
    if (alt) {
      return {
        ...slot,
        isAltered: true,
        effectiveTeacherId: alt.substituteTeacherId,
      };
    }
    return { ...slot, isAltered: false, effectiveTeacherId: slot.teacherId };
  });
}

export function buildSubstituteTiers(
  assignments: Array<{
    teacherId: string;
    subjectId: string;
    classSectionId: string;
    gradeId: string;
  }>,
  input: {
    subjectId: string;
    classSectionId: string;
    gradeId: string;
    absentTeacherId: string;
  },
) {
  const { subjectId, classSectionId, gradeId, absentTeacherId } = input;

  const tier1 = assignments
    .filter(
      (a) =>
        a.subjectId === subjectId &&
        a.classSectionId !== classSectionId &&
        a.gradeId === gradeId &&
        a.teacherId !== absentTeacherId,
    )
    .map((a) => a.teacherId);

  const tier2 = assignments
    .filter(
      (a) =>
        a.classSectionId === classSectionId &&
        a.subjectId !== subjectId &&
        a.teacherId !== absentTeacherId,
    )
    .map((a) => a.teacherId);

  const tier3 = assignments
    .filter(
      (a) =>
        a.gradeId === gradeId &&
        a.teacherId !== absentTeacherId &&
        !tier1.includes(a.teacherId) &&
        !tier2.includes(a.teacherId),
    )
    .map((a) => a.teacherId);

  return {
    tier1: [...new Set(tier1)],
    tier2: [...new Set(tier2)],
    tier3: [...new Set(tier3)],
  };
}

async function getSubstituteStats(
  schoolId: string,
  teacherIds: string[],
  db: DbClient = prisma,
): Promise<Map<string, number>> {
  const stats = await db.teacherAlterationStat.findMany({
    where: { schoolId, teacherId: { in: teacherIds } },
  });
  const map = new Map<string, number>();
  for (const id of teacherIds) map.set(id, 0);
  for (const s of stats) map.set(s.teacherId, s.asSubstituteCount);
  return map;
}

export async function findSubstituteTeacher(
  schoolId: string,
  input: {
    subjectId: string;
    classSectionId: string;
    gradeId: string;
    date: Date;
    periodNo: number;
    absentTeacherId: string;
  },
  db: DbClient = prisma,
): Promise<SubstituteResult | null> {
  const { subjectId, classSectionId, gradeId, date, periodNo, absentTeacherId } = input;
  const exclude = new Set([absentTeacherId]);

  const assignments = await db.teacherAssignment.findMany({
    where: { schoolId },
    include: { classSection: true },
  });

  const activeTeachers = await getActiveTeacherIds(schoolId, db);

  async function freeInTier(teacherIds: string[]): Promise<string[]> {
    const available: string[] = [];
    for (const tid of teacherIds) {
      if (!activeTeachers.has(tid)) continue;
      if (await isTeacherFree(schoolId, tid, date, periodNo, exclude, db)) {
        available.push(tid);
      }
    }
    return available;
  }

  // Priority 1: same subject, different section, same grade
  const tier1 = assignments
    .filter(
      (a) =>
        a.subjectId === subjectId &&
        a.classSectionId !== classSectionId &&
        a.classSection.gradeId === gradeId &&
        a.teacherId !== absentTeacherId,
    )
    .map((a) => a.teacherId);
  const tier1Available = await freeInTier([...new Set(tier1)]);

  // Priority 2: same section, different subject
  const tier2 = assignments
    .filter(
      (a) =>
        a.classSectionId === classSectionId &&
        a.subjectId !== subjectId &&
        a.teacherId !== absentTeacherId,
    )
    .map((a) => a.teacherId);
  const tier2Available = await freeInTier([...new Set(tier2)]);

  // Priority 3: any assignment in same grade
  const tier3 = assignments
    .filter(
      (a) =>
        a.classSection.gradeId === gradeId &&
        a.teacherId !== absentTeacherId &&
        !tier1.includes(a.teacherId) &&
        !tier2.includes(a.teacherId),
    )
    .map((a) => a.teacherId);
  const tier3Available = await freeInTier([...new Set(tier3)]);

  // Priority 4: any remaining active teacher
  const allAssigned = new Set(assignments.map((a) => a.teacherId));
  const tier4Candidates = [...activeTeachers].filter(
    (tid) =>
      tid !== absentTeacherId &&
      !tier1Available.includes(tid) &&
      !tier2Available.includes(tid) &&
      !tier3Available.includes(tid),
  );
  // Prefer teachers with assignments, but include unassigned if free
  const tier4 = tier4Candidates.filter((tid) => allAssigned.has(tid) || true);
  const tier4Available = await freeInTier([...new Set(tier4)]);

  const tiers = [
    { level: 1, candidates: tier1Available },
    { level: 2, candidates: tier2Available },
    { level: 3, candidates: tier3Available },
    { level: 4, candidates: tier4Available },
  ];

  const allCandidates = tiers.flatMap((t) => t.candidates);
  const stats = await getSubstituteStats(schoolId, allCandidates, db);

  for (const tier of tiers) {
    const picked = pickBestCandidate(tier.candidates, stats);
    if (picked) return { teacherId: picked, priorityLevel: tier.level };
  }

  return null;
}

export async function incrementAlterationStats(
  schoolId: string,
  substituteTeacherId: string,
  originalTeacherId: string,
  db: DbClient = prisma,
) {
  await db.teacherAlterationStat.upsert({
    where: { schoolId_teacherId: { schoolId, teacherId: substituteTeacherId } },
    create: { schoolId, teacherId: substituteTeacherId, asSubstituteCount: 1, classesAlteredForCount: 0 },
    update: { asSubstituteCount: { increment: 1 } },
  });
  await db.teacherAlterationStat.upsert({
    where: { schoolId_teacherId: { schoolId, teacherId: originalTeacherId } },
    create: { schoolId, teacherId: originalTeacherId, asSubstituteCount: 0, classesAlteredForCount: 1 },
    update: { classesAlteredForCount: { increment: 1 } },
  });
}

export async function decrementAlterationStats(
  schoolId: string,
  substituteTeacherId: string,
  originalTeacherId: string,
  db: DbClient = prisma,
) {
  const subStat = await db.teacherAlterationStat.findUnique({
    where: { schoolId_teacherId: { schoolId, teacherId: substituteTeacherId } },
  });
  if (subStat && subStat.asSubstituteCount > 0) {
    await db.teacherAlterationStat.update({
      where: { id: subStat.id },
      data: { asSubstituteCount: { decrement: 1 } },
    });
  }
  const origStat = await db.teacherAlterationStat.findUnique({
    where: { schoolId_teacherId: { schoolId, teacherId: originalTeacherId } },
  });
  if (origStat && origStat.classesAlteredForCount > 0) {
    await db.teacherAlterationStat.update({
      where: { id: origStat.id },
      data: { classesAlteredForCount: { decrement: 1 } },
    });
  }
}

export async function validateAlterationConflict(
  schoolId: string,
  date: Date,
  periodNo: number,
  substituteTeacherId: string,
  classSectionId: string,
  excludeAlterationId?: string,
  db: DbClient = prisma,
): Promise<string | null> {
  const effective = await resolveEffectiveSlots(schoolId, date, db);
  const dayOfWeek = dateToDayOfWeek(date);
  const testSlot: ScheduleSlotInput = {
    dayOfWeek,
    periodNo,
    teacherId: substituteTeacherId,
    classSectionId,
    subjectId: effective.find((s) => s.classSectionId === classSectionId && s.periodNo === periodNo)?.subjectId ?? "",
  };

  const others = effective
    .filter((s) => !(s.periodNo === periodNo && s.classSectionId === classSectionId))
    .filter((s) => s.alterationId !== excludeAlterationId)
    .map((s) => ({
      dayOfWeek: s.dayOfWeek,
      periodNo: s.periodNo,
      teacherId: s.teacherId,
      classSectionId: s.classSectionId,
      subjectId: s.subjectId,
    }));

  return validateSlotConflict(others, testSlot);
}

export async function applyLeaveSubstitutions(
  leaveRequestId: string,
  createdBy: string,
): Promise<LeaveSubstitutionResult> {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } });
  if (!leave) throw new Error("Leave request not found");
  if (leave.requesterType !== "TEACHER") {
    return { alteredCount: 0, uncoveredSlots: [] };
  }
  if (leave.substitutionsGenerated) {
    return { alteredCount: leave.alteredClassCount ?? 0, uncoveredSlots: [] };
  }

  const schoolId = leave.schoolId;
  const config = await prisma.schoolScheduleConfig.findUnique({ where: { schoolId } });
  const workingDays = new Set(config?.workingDays ?? [0, 1, 2, 3, 4]);

  const version = await prisma.scheduleVersion.findFirst({
    where: { schoolId, isActive: true },
  });
  if (!version) {
    await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: { substitutionsGenerated: true, alteredClassCount: 0 },
    });
    return { alteredCount: 0, uncoveredSlots: [] };
  }

  let alteredCount = 0;
  const uncoveredSlots: LeaveSubstitutionResult["uncoveredSlots"] = [];
  const substituteNotify = new Map<string, number>();

  await prisma.$transaction(async (tx) => {
    const dates = eachDateInRange(leave.startDate, leave.endDate);

    for (const date of dates) {
      const dayOfWeek = dateToDayOfWeek(date);
      if (!workingDays.has(dayOfWeek)) continue;

      const slots = await tx.scheduleSlot.findMany({
        where: {
          versionId: version.id,
          dayOfWeek,
          teacherId: leave.requesterId,
        },
        include: { classSection: true },
      });

      for (const slot of slots) {
        const sub = await findSubstituteTeacher(
          schoolId,
          {
            subjectId: slot.subjectId,
            classSectionId: slot.classSectionId,
            gradeId: slot.classSection.gradeId,
            date,
            periodNo: slot.periodNo,
            absentTeacherId: leave.requesterId,
          },
          tx,
        );

        if (!sub) {
          uncoveredSlots.push({
            date: startOfDay(date),
            periodNo: slot.periodNo,
            classSectionId: slot.classSectionId,
            subjectId: slot.subjectId,
          });
          continue;
        }

        const conflict = await validateAlterationConflict(
          schoolId,
          date,
          slot.periodNo,
          sub.teacherId,
          slot.classSectionId,
          undefined,
          tx,
        );
        if (conflict) {
          uncoveredSlots.push({
            date: startOfDay(date),
            periodNo: slot.periodNo,
            classSectionId: slot.classSectionId,
            subjectId: slot.subjectId,
          });
          continue;
        }

        await tx.scheduleAlteration.create({
          data: {
            schoolId,
            date: startOfDay(date),
            periodNo: slot.periodNo,
            classSectionId: slot.classSectionId,
            subjectId: slot.subjectId,
            originalTeacherId: leave.requesterId,
            substituteTeacherId: sub.teacherId,
            type: "LEAVE_SUBSTITUTION",
            priorityLevel: sub.priorityLevel,
            leaveRequestId,
            createdBy,
          },
        });

        await incrementAlterationStats(schoolId, sub.teacherId, leave.requesterId, tx);
        alteredCount++;
        substituteNotify.set(sub.teacherId, (substituteNotify.get(sub.teacherId) ?? 0) + 1);
      }
    }

    await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: { substitutionsGenerated: true, alteredClassCount: alteredCount },
    });
  });

  await enqueueNotification({
    schoolId,
    userId: leave.requesterId,
    title: "Leave Approved — Schedule Updated",
    body: `${alteredCount} class${alteredCount === 1 ? "" : "es"} covered by substitutes during your leave.`,
    metadata: { leaveRequestId, alteredClassCount: alteredCount, uncoveredCount: uncoveredSlots.length },
  });

  for (const [teacherId, count] of substituteNotify) {
    await enqueueNotification({
      schoolId,
      userId: teacherId,
      title: "Substitution Assignment",
      body: `You have been assigned to cover ${count} class${count === 1 ? "" : "es"} during a colleague's leave.`,
      metadata: { leaveRequestId, count },
    });
  }

  return { alteredCount, uncoveredSlots };
}

export async function cancelLeaveAlterations(leaveRequestId: string): Promise<number> {
  const alterations = await prisma.scheduleAlteration.findMany({
    where: { leaveRequestId, status: "ACTIVE" },
  });

  if (alterations.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    for (const alt of alterations) {
      await tx.scheduleAlteration.update({
        where: { id: alt.id },
        data: { status: "CANCELLED" },
      });
      await decrementAlterationStats(
        alt.schoolId,
        alt.substituteTeacherId,
        alt.originalTeacherId,
        tx,
      );
    }
    await tx.leaveRequest.update({
      where: { id: leaveRequestId },
      data: { substitutionsGenerated: false, alteredClassCount: null },
    });
  });

  return alterations.length;
}

export async function getEffectiveScheduleForTeacher(
  schoolId: string,
  teacherId: string,
  date: Date,
  db: DbClient = prisma,
): Promise<EffectiveSlot[]> {
  const all = await resolveEffectiveSlots(schoolId, date, db);
  return all.filter(
    (s) => s.teacherId === teacherId || s.originalTeacherId === teacherId,
  );
}

export async function getEffectiveWeeklyScheduleForTeacher(
  schoolId: string,
  teacherId: string,
  weekStart: Date,
  db: DbClient = prisma,
): Promise<Array<EffectiveSlot & { date: Date }>> {
  const config = await db.schoolScheduleConfig.findUnique({ where: { schoolId } });
  const workingDays = config?.workingDays ?? [0, 1, 2, 3, 4];
  const daysPerWeek = config?.daysPerWeek ?? 5;

  const results: Array<EffectiveSlot & { date: Date }> = [];
  const start = startOfDay(weekStart);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dow = dateToDayOfWeek(date);
    if (!workingDays.slice(0, daysPerWeek).includes(dow)) continue;

    const daySlots = await getEffectiveScheduleForTeacher(schoolId, teacherId, date, db);
    for (const slot of daySlots) {
      results.push({ ...slot, date: startOfDay(date) });
    }
  }

  return results;
}
