import { prisma } from "@/lib/db/prisma";
import {
  dateToDayOfWeek,
  incrementAlterationStats,
  decrementAlterationStats,
  isTeacherFree,
  resolveEffectiveSlots,
  startOfDay,
  validateAlterationConflict,
} from "@/lib/scheduler/smart-scheduler";

export interface ComplementarySwapInput {
  schoolId: string;
  teacherAId: string;
  teacherBId: string;
  dateA: Date;
  periodA: number;
  dateB: Date;
  periodB: number;
  createdBy: string;
  note?: string;
}

export interface ParallelSwapInput {
  schoolId: string;
  teacherAId: string;
  teacherBId: string;
  date: Date;
  createdBy: string;
  note?: string;
}

async function assertWorkingDay(schoolId: string, date: Date) {
  const config = await prisma.schoolScheduleConfig.findUnique({ where: { schoolId } });
  const workingDays = config?.workingDays ?? [0, 1, 2, 3, 4];
  const dow = dateToDayOfWeek(date);
  if (!workingDays.includes(dow)) {
    throw new Error(`Date ${date.toISOString().slice(0, 10)} is not a working day`);
  }
}

async function getBaseSlotForTeacher(
  schoolId: string,
  teacherId: string,
  date: Date,
  periodNo: number,
) {
  const dayOfWeek = dateToDayOfWeek(date);
  const version = await prisma.scheduleVersion.findFirst({
    where: { schoolId, isActive: true },
  });
  if (!version) throw new Error("No active schedule");

  return prisma.scheduleSlot.findFirst({
    where: { versionId: version.id, dayOfWeek, periodNo, teacherId },
    include: { classSection: true, subject: true },
  });
}

export async function createComplementarySwap(input: ComplementarySwapInput) {
  const { schoolId, teacherAId, teacherBId, dateA, periodA, dateB, periodB, createdBy, note } =
    input;

  if (teacherAId === teacherBId) throw new Error("Cannot swap with yourself");

  await assertWorkingDay(schoolId, dateA);
  await assertWorkingDay(schoolId, dateB);

  const slotA = await getBaseSlotForTeacher(schoolId, teacherAId, dateA, periodA);
  const slotB = await getBaseSlotForTeacher(schoolId, teacherBId, dateB, periodB);

  if (!slotA) throw new Error("Teacher A has no class at the specified date and period");
  if (!slotB) throw new Error("Teacher B has no class at the specified date and period");

  const aFreeOnB = await isTeacherFree(schoolId, teacherAId, dateB, periodB, new Set([teacherBId]));
  const bFreeOnA = await isTeacherFree(schoolId, teacherBId, dateA, periodA, new Set([teacherAId]));

  if (!aFreeOnB) throw new Error("Teacher A is not free on date B at the specified period");
  if (!bFreeOnA) throw new Error("Teacher B is not free on date A at the specified period");

  const conflictA = await validateAlterationConflict(
    schoolId,
    dateA,
    periodA,
    teacherBId,
    slotA.classSectionId,
  );
  if (conflictA) throw new Error(`Swap conflict on date A: ${conflictA}`);

  const conflictB = await validateAlterationConflict(
    schoolId,
    dateB,
    periodB,
    teacherAId,
    slotB.classSectionId,
  );
  if (conflictB) throw new Error(`Swap conflict on date B: ${conflictB}`);

  return prisma.$transaction(async (tx) => {
    const group = await tx.scheduleSwapGroup.create({
      data: {
        schoolId,
        type: "COMPLEMENTARY_FREE",
        teacherAId,
        teacherBId,
        note,
        createdBy,
      },
    });

    await tx.scheduleAlteration.create({
      data: {
        schoolId,
        date: startOfDay(dateA),
        periodNo: periodA,
        classSectionId: slotA.classSectionId,
        subjectId: slotA.subjectId,
        originalTeacherId: teacherAId,
        substituteTeacherId: teacherBId,
        type: "SWAP",
        swapGroupId: group.id,
        createdBy,
      },
    });

    await tx.scheduleAlteration.create({
      data: {
        schoolId,
        date: startOfDay(dateB),
        periodNo: periodB,
        classSectionId: slotB.classSectionId,
        subjectId: slotB.subjectId,
        originalTeacherId: teacherBId,
        substituteTeacherId: teacherAId,
        type: "SWAP",
        swapGroupId: group.id,
        createdBy,
      },
    });

    await incrementAlterationStats(schoolId, teacherBId, teacherAId, tx);
    await incrementAlterationStats(schoolId, teacherAId, teacherBId, tx);

    return group;
  });
}

export async function findParallelSectionPairs(
  schoolId: string,
  teacherAId: string,
  teacherBId: string,
) {
  const version = await prisma.scheduleVersion.findFirst({
    where: { schoolId, isActive: true },
  });
  if (!version) return [];

  const slotsA = await prisma.scheduleSlot.findMany({
    where: { versionId: version.id, teacherId: teacherAId },
    include: { classSection: true, subject: true },
  });

  const slotsB = await prisma.scheduleSlot.findMany({
    where: { versionId: version.id, teacherId: teacherBId },
    include: { classSection: true, subject: true },
  });

  const pairs: Array<{
    dayOfWeek: number;
    periodNo: number;
    slotA: (typeof slotsA)[0];
    slotB: (typeof slotsB)[0];
  }> = [];

  for (const a of slotsA) {
    const b = slotsB.find(
      (s) =>
        s.dayOfWeek === a.dayOfWeek &&
        s.periodNo === a.periodNo &&
        s.classSectionId !== a.classSectionId,
    );
    if (!b) continue;

    const aSections = new Set(
      slotsA.filter((s) => s.dayOfWeek === a.dayOfWeek && s.periodNo === a.periodNo).map((s) => s.classSectionId),
    );
    const bSections = new Set(
      slotsB.filter((s) => s.dayOfWeek === b.dayOfWeek && s.periodNo === b.periodNo).map((s) => s.classSectionId),
    );

    const sharedSections = [...aSections].filter((id) => bSections.has(id));
    if (sharedSections.length >= 2) {
      pairs.push({ dayOfWeek: a.dayOfWeek, periodNo: a.periodNo, slotA: a, slotB: b });
    }
  }

  return pairs;
}

export async function createParallelSectionSwap(input: ParallelSwapInput) {
  const { schoolId, teacherAId, teacherBId, date, createdBy, note } = input;

  if (teacherAId === teacherBId) throw new Error("Cannot swap with yourself");

  await assertWorkingDay(schoolId, date);
  const dayOfWeek = dateToDayOfWeek(date);

  const version = await prisma.scheduleVersion.findFirst({
    where: { schoolId, isActive: true },
  });
  if (!version) throw new Error("No active schedule");

  const slotsA = await prisma.scheduleSlot.findMany({
    where: { versionId: version.id, teacherId: teacherAId, dayOfWeek },
    include: { classSection: true },
  });

  const slotsB = await prisma.scheduleSlot.findMany({
    where: { versionId: version.id, teacherId: teacherBId, dayOfWeek },
    include: { classSection: true },
  });

  const swapPairs: Array<{ slotA: (typeof slotsA)[0]; slotB: (typeof slotsB)[0] }> = [];

  for (const a of slotsA) {
    const b = slotsB.find(
      (s) => s.periodNo === a.periodNo && s.classSectionId !== a.classSectionId,
    );
    if (!b) continue;

    const aSectionsAtPeriod = slotsA.filter((s) => s.periodNo === a.periodNo).map((s) => s.classSectionId);
    const bSectionsAtPeriod = slotsB.filter((s) => s.periodNo === b.periodNo).map((s) => s.classSectionId);
    const shared = aSectionsAtPeriod.filter((id) => bSectionsAtPeriod.includes(id));
    if (shared.length >= 2) {
      swapPairs.push({ slotA: a, slotB: b });
    }
  }

  if (swapPairs.length === 0) {
    throw new Error("No parallel section assignments found for these teachers on this day");
  }

  for (const { slotA, slotB } of swapPairs) {
    const conflictA = await validateAlterationConflict(
      schoolId,
      date,
      slotA.periodNo,
      teacherBId,
      slotA.classSectionId,
    );
    if (conflictA) throw new Error(`Swap conflict for section ${slotA.classSection.name}: ${conflictA}`);

    const conflictB = await validateAlterationConflict(
      schoolId,
      date,
      slotB.periodNo,
      teacherAId,
      slotB.classSectionId,
    );
    if (conflictB) throw new Error(`Swap conflict for section ${slotB.classSection.name}: ${conflictB}`);
  }

  return prisma.$transaction(async (tx) => {
    const group = await tx.scheduleSwapGroup.create({
      data: {
        schoolId,
        type: "PARALLEL_SECTIONS",
        teacherAId,
        teacherBId,
        note,
        createdBy,
      },
    });

    for (const { slotA, slotB } of swapPairs) {
      await tx.scheduleAlteration.create({
        data: {
          schoolId,
          date: startOfDay(date),
          periodNo: slotA.periodNo,
          classSectionId: slotA.classSectionId,
          subjectId: slotA.subjectId,
          originalTeacherId: teacherAId,
          substituteTeacherId: teacherBId,
          type: "SWAP",
          swapGroupId: group.id,
          createdBy,
        },
      });

      await tx.scheduleAlteration.create({
        data: {
          schoolId,
          date: startOfDay(date),
          periodNo: slotB.periodNo,
          classSectionId: slotB.classSectionId,
          subjectId: slotB.subjectId,
          originalTeacherId: teacherBId,
          substituteTeacherId: teacherAId,
          type: "SWAP",
          swapGroupId: group.id,
          createdBy,
        },
      });

      await incrementAlterationStats(schoolId, teacherBId, teacherAId, tx);
      await incrementAlterationStats(schoolId, teacherAId, teacherBId, tx);
    }

    return { group, swapCount: swapPairs.length };
  });
}

export async function cancelSwapGroup(swapGroupId: string): Promise<number> {
  const alterations = await prisma.scheduleAlteration.findMany({
    where: { swapGroupId, status: "ACTIVE" },
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
  });

  return alterations.length;
}

export async function listActiveSwapGroups(schoolId: string, teacherId?: string) {
  const groups = await prisma.scheduleSwapGroup.findMany({
    where: {
      schoolId,
      ...(teacherId
        ? { OR: [{ teacherAId: teacherId }, { teacherBId: teacherId }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      alterations: {
        where: { status: "ACTIVE" },
        include: { classSection: true, subject: true },
      },
    },
  });

  return groups.filter((g) => g.alterations.length > 0);
}
