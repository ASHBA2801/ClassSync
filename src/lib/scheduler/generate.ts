import { prisma } from "@/lib/db/prisma";
import { getSchedulerQueue } from "@/lib/queue/queues";
import { solveSchedule } from "@/lib/scheduler/solver";
import type { SchedulerInput } from "@/lib/scheduler/solver";

export async function enqueueScheduleGeneration(schoolId: string) {
  const queue = getSchedulerQueue();
  await queue.add("generate", { schoolId }, { attempts: 2 });
}

export async function generateScheduleForSchool(schoolId: string) {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { schoolId },
    include: { subject: true },
  });

  const constraints = await prisma.scheduleConstraint.findMany({ where: { schoolId } });
  const periodTimings = await prisma.periodTiming.findMany({
    where: { schoolId },
    orderBy: { periodNo: "asc" },
  });

  const periodsPerDay = periodTimings.length || 8;
  const daysPerWeek = 5;

  const input: SchedulerInput = {
    daysPerWeek,
    periodsPerDay,
    assignments: assignments.map((a) => ({
      teacherId: a.teacherId,
      classSectionId: a.classSectionId,
      subjectId: a.subjectId,
      periodsPerWeek: a.subject.periodsPerWeek,
    })),
    constraints: constraints.map((c) => ({
      teacherId: c.teacherId ?? undefined,
      minFreePeriods: c.minFreePeriods,
      maxFreePeriods: c.maxFreePeriods,
    })),
  };

  if (constraints.length === 0) {
    input.constraints.push({ minFreePeriods: 1, maxFreePeriods: 3 });
  }

  const result = solveSchedule(input);
  if (!result.success) {
    return { success: false as const, errors: result.errors };
  }

  const latestVersion = await prisma.scheduleVersion.findFirst({
    where: { schoolId },
    orderBy: { version: "desc" },
  });

  const newVersion = (latestVersion?.version ?? 0) + 1;

  await prisma.scheduleVersion.updateMany({
    where: { schoolId, isActive: true },
    data: { isActive: false },
  });

  const version = await prisma.scheduleVersion.create({
    data: { schoolId, version: newVersion, isActive: true },
  });

  await prisma.scheduleSlot.createMany({
    data: result.slots.map((slot) => ({
      schoolId,
      versionId: version.id,
      ...slot,
    })),
  });

  return { success: true as const, versionId: version.id, slotCount: result.slots.length };
}
