import { prisma } from "@/lib/db/prisma";
import { getSchedulerQueue } from "@/lib/queue/queues";
import {
  analyzeScheduleFeasibility,
  summarizeSchedulerErrors,
  type SchedulerLabels,
} from "@/lib/scheduler/errors";
import { evaluateScheduleReadiness } from "@/lib/scheduler/readiness";
import { solveSchedule, DEFAULT_TIMETABLE_QUALITY } from "@/lib/scheduler/solver";
import type { SchedulerInput } from "@/lib/scheduler/solver";

export async function enqueueScheduleGeneration(schoolId: string) {
  const queue = getSchedulerQueue();
  await queue.add("generate", { schoolId }, { attempts: 2 });
}

export async function generateScheduleForSchool(schoolId: string) {
  const readiness = await evaluateScheduleReadiness(schoolId);
  if (!readiness.isReady) {
    return {
      success: false as const,
      errors: readiness.checks.filter((c) => !c.passed).map((c) => c.message),
    };
  }

  const assignments = await prisma.teacherAssignment.findMany({
    where: { schoolId },
    include: {
      subject: true,
      teacher: { select: { id: true, name: true } },
      classSection: true,
    },
  });

  const constraints = await prisma.scheduleConstraint.findMany({ where: { schoolId } });
  const periodTimings = await prisma.periodTiming.findMany({
    where: { schoolId },
    orderBy: { periodNo: "asc" },
  });
  const scheduleConfig = await prisma.schoolScheduleConfig.findUnique({ where: { schoolId } });

  const periodsPerDay = periodTimings.length;
  const daysPerWeek = scheduleConfig?.daysPerWeek ?? 5;
  const workingDays = scheduleConfig?.workingDays ?? [0, 1, 2, 3, 4];

  const labels: SchedulerLabels = { teachers: {}, sections: {}, subjects: {} };
  for (const a of assignments) {
    labels.teachers[a.teacherId] = a.teacher.name;
    labels.sections[a.classSectionId] = a.classSection.name;
    labels.subjects[a.subjectId] = a.subject.name;
  }

  const input: SchedulerInput = {
    daysPerWeek,
    workingDays,
    periodsPerDay,
    assignments: assignments.map((a) => ({
      teacherId: a.teacherId,
      classSectionId: a.classSectionId,
      subjectId: a.subjectId,
      periodsPerWeek:
        a.periodsPerWeek ?? a.subject.periodsPerWeek,
    })),
    constraints: constraints.map((c) => ({
      teacherId: c.teacherId ?? undefined,
      minFreePerWeek: c.minFreePerWeek,
      maxFreePerWeek: c.maxFreePerWeek,
    })),
    quality: scheduleConfig
      ? {
          maxSameSubjectPerDay: scheduleConfig.maxSameSubjectPerDay,
          maxConsecutiveSameSubject: scheduleConfig.maxConsecutiveSameSubject,
          requireFullSectionWeek: scheduleConfig.requireFullSectionWeek,
        }
      : DEFAULT_TIMETABLE_QUALITY,
    labels,
  };

  const feasibilityErrors = analyzeScheduleFeasibility(input, labels);
  if (feasibilityErrors.length > 0) {
    const errors = summarizeSchedulerErrors(feasibilityErrors);
    console.error(`[scheduler] Feasibility check failed for school ${schoolId}:`, errors);
    return { success: false as const, errors };
  }

  const result = solveSchedule(input);
  if (!result.success) {
    console.error(`[scheduler] Generation failed for school ${schoolId}:`, result.errors);
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

  console.log(
    `[scheduler] Generated v${newVersion} for school ${schoolId} (${result.slots.length} slots)`,
  );

  return { success: true as const, versionId: version.id, slotCount: result.slots.length };
}
