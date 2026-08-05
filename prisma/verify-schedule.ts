/**
 * Verifies that the demo seed can produce a valid timetable.
 * Run after `npm run db:seed` — exits 0 only when generation succeeds.
 */
import { prisma } from "../src/lib/db/prisma";
import {
  analyzeScheduleFeasibility,
  type SchedulerLabels,
} from "../src/lib/scheduler/errors";
import { evaluateScheduleReadiness } from "../src/lib/scheduler/readiness";
import {
  solveSchedule,
  DEFAULT_TIMETABLE_QUALITY,
  validateSectionScheduleQuality,
} from "../src/lib/scheduler/solver";
import type { SchedulerInput } from "../src/lib/scheduler/solver";

const DEMO_SCHOOL_SLUG = "demo-school";
const MAX_ATTEMPTS = 5;

async function loadSchedulerInput(schoolId: string): Promise<SchedulerInput> {
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

  const labels: SchedulerLabels = { teachers: {}, sections: {}, subjects: {} };
  for (const a of assignments) {
    labels.teachers[a.teacherId] = a.teacher.name;
    labels.sections[a.classSectionId] = a.classSection.name;
    labels.subjects[a.subjectId] = a.subject.name;
  }

  return {
    daysPerWeek: scheduleConfig?.daysPerWeek ?? 5,
    workingDays: scheduleConfig?.workingDays ?? [0, 1, 2, 3, 4],
    periodsPerDay: periodTimings.length,
    assignments: assignments.map((a) => ({
      teacherId: a.teacherId,
      classSectionId: a.classSectionId,
      subjectId: a.subjectId,
      periodsPerWeek: a.periodsPerWeek ?? a.subject.periodsPerWeek,
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
}

async function main() {
  const school = await prisma.school.findUnique({ where: { slug: DEMO_SCHOOL_SLUG } });
  if (!school) {
    console.error(`Demo school "${DEMO_SCHOOL_SLUG}" not found. Run npm run db:seed first.`);
    process.exit(1);
  }

  const readiness = await evaluateScheduleReadiness(school.id);
  if (!readiness.isReady) {
    console.error("Schedule setup not ready:");
    for (const check of readiness.checks.filter((c) => !c.passed)) {
      console.error(`  - ${check.message}`);
    }
    process.exit(1);
  }

  const input = await loadSchedulerInput(school.id);
  const labels = input.labels ?? { teachers: {}, sections: {}, subjects: {} };

  const feasibilityErrors = analyzeScheduleFeasibility(input, labels);
  if (feasibilityErrors.length > 0) {
    console.error("Feasibility check failed:");
    for (const err of feasibilityErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(`Verifying schedule generation for ${school.name} (${school.id})…`);
  console.log(
    `  ${input.assignments.length} assignments, ${input.periodsPerDay} periods/day, ${input.daysPerWeek} days/week`,
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    const result = solveSchedule(input);
    const elapsed = Date.now() - started;

    if (!result.success) {
      console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} failed (${elapsed}ms):`);
      for (const err of result.errors) console.error(`  - ${err}`);
      continue;
    }

    const sectionIds = [...new Set(input.assignments.map((a) => a.classSectionId))];
    const qualityErrors: string[] = [];
    for (const sectionId of sectionIds) {
      const sectionSlots = result.slots.filter((s) => s.classSectionId === sectionId);
      qualityErrors.push(
        ...validateSectionScheduleQuality(sectionSlots, sectionId, input, labels),
      );
    }

    if (qualityErrors.length > 0) {
      console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} produced invalid quality (${elapsed}ms):`);
      for (const err of qualityErrors) console.error(`  - ${err}`);
      continue;
    }

    console.log(`✓ Valid schedule generated on attempt ${attempt} (${elapsed}ms)`);
    console.log(`  ${result.slots.length} total slots`);

    for (const sectionId of sectionIds) {
      const name = labels.sections[sectionId] ?? sectionId;
      const count = result.slots.filter((s) => s.classSectionId === sectionId).length;
      console.log(`  ${name}: ${count} slots`);
    }

    process.exit(0);
  }

  console.error(`Failed to generate a valid schedule after ${MAX_ATTEMPTS} attempts.`);
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
