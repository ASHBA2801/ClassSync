import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";
import { seedPermissions } from "../src/lib/rbac/permissions";
import { analyzeScheduleFeasibility } from "../src/lib/scheduler/errors";
import { solveSchedule, validateSectionScheduleQuality } from "../src/lib/scheduler/solver";

const DEMO_TEACHERS = [
  { email: "teacher@demo.com", name: "Demo Teacher" },
  { email: "teacher2@demo.com", name: "Demo Teacher 2" },
  { email: "teacher3@demo.com", name: "Demo Teacher 3" },
  { email: "teacher4@demo.com", name: "Demo Teacher 4" },
  { email: "teacher5@demo.com", name: "Demo Teacher 5" },
  { email: "teacher6@demo.com", name: "Demo Teacher 6" },
  { email: "teacher7@demo.com", name: "Demo Teacher 7" },
  { email: "teacher8@demo.com", name: "Demo Teacher 8" },
  { email: "teacher9@demo.com", name: "Demo Teacher 9" },
  { email: "teacher10@demo.com", name: "Demo Teacher 10" },
] as const;

const DEMO_SUBJECTS = [
  { name: "Mathematics", code: "MATH", periodsPerWeek: 8 },
  { name: "English", code: "ENG", periodsPerWeek: 8 },
  { name: "Science", code: "SCI", periodsPerWeek: 8 },
  { name: "History", code: "HIS", periodsPerWeek: 8 },
  { name: "Physical Education", code: "PE", periodsPerWeek: 8 },
] as const;

/** Demo timetable: 5 days × 8 periods = 40 slots/week. */
const DEMO_DAYS_PER_WEEK = 5;
const DEMO_PERIODS_PER_DAY = 8;
const DEMO_TOTAL_WEEKLY_SLOTS = DEMO_DAYS_PER_WEEK * DEMO_PERIODS_PER_DAY;
/**
 * Max free/week must be high enough for the busiest teacher (16 periods with 2 sections × 8).
 * Teachers carry 8–16 periods/week → need minWeeklyBusy ≤ 8 → maxFreePerWeek ≥ 32.
 */
const DEMO_MIN_FREE_PER_WEEK = 1;
const DEMO_MAX_FREE_PER_WEEK = 35;

/** One dedicated teacher per section-subject (10 teachers, 8 periods/week each). */
const DEMO_ASSIGNMENTS: Array<{ section: "A" | "B"; subject: string; teacherEmail: string }> = [
  { section: "A", subject: "Mathematics", teacherEmail: "teacher@demo.com" },
  { section: "A", subject: "English", teacherEmail: "teacher2@demo.com" },
  { section: "A", subject: "Science", teacherEmail: "teacher3@demo.com" },
  { section: "A", subject: "History", teacherEmail: "teacher4@demo.com" },
  { section: "A", subject: "Physical Education", teacherEmail: "teacher5@demo.com" },
  { section: "B", subject: "Mathematics", teacherEmail: "teacher6@demo.com" },
  { section: "B", subject: "English", teacherEmail: "teacher7@demo.com" },
  { section: "B", subject: "Science", teacherEmail: "teacher8@demo.com" },
  { section: "B", subject: "History", teacherEmail: "teacher9@demo.com" },
  { section: "B", subject: "Physical Education", teacherEmail: "teacher10@demo.com" },
];

async function main() {
  console.log("Seeding permissions...");
  await seedPermissions();

  const passwordHash = await hash("admin123", 12);
  const teacherPasswordHash = await hash("teacher123", 12);

  const systemAdmin = await prisma.user.upsert({
    where: { email: "admin@classsync.app" },
    create: {
      email: "admin@classsync.app",
      name: "System Admin",
      passwordHash,
    },
    update: { passwordHash },
  });

  const school = await prisma.school.upsert({
    where: { slug: "demo-school" },
    create: {
      name: "Demo School",
      slug: "demo-school",
      timezone: "Asia/Kolkata",
      campusLat: 12.9716,
      campusLng: 77.5946,
      campusRadiusM: 500,
      planTier: "PREMIUM",
    },
    update: {},
  });

  const schoolAdmin = await prisma.user.upsert({
    where: { email: "schooladmin@demo.com" },
    create: {
      email: "schooladmin@demo.com",
      name: "School Admin",
      passwordHash: await hash("school123", 12),
    },
    update: { passwordHash: await hash("school123", 12) },
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent@demo.com" },
    create: {
      email: "parent@demo.com",
      name: "Demo Parent",
      passwordHash: await hash("parent123", 12),
    },
    update: { passwordHash: await hash("parent123", 12) },
  });

  const teacherUsers = new Map<string, { id: string; name: string }>();
  for (const t of DEMO_TEACHERS) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      create: {
        email: t.email,
        name: t.name,
        passwordHash: teacherPasswordHash,
      },
      update: { name: t.name, passwordHash: teacherPasswordHash },
    });
    teacherUsers.set(t.email, { id: user.id, name: user.name });

    await prisma.userSchoolMembership.upsert({
      where: { userId_schoolId: { userId: user.id, schoolId: school.id } },
      create: { userId: user.id, schoolId: school.id, role: "TEACHER" },
      update: {},
    });

    await prisma.employee.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      create: {
        schoolId: school.id,
        userId: user.id,
        employeeCode: `TCH-${t.email.split("@")[0].toUpperCase()}`,
        jobType: t.email === "teacher5@demo.com" ? "PET_MASTER" : "TEACHER",
        dateOfJoining: new Date("2024-04-01"),
      },
      update: {},
    });
  }

  const demoStaff = [
    { email: "driver@demo.com", name: "Demo Van Driver", code: "DRV-001", jobType: "VAN_DRIVER" as const },
    { email: "security@demo.com", name: "Demo Security Guard", code: "SEC-001", jobType: "SECURITY_GUARD" as const },
    { email: "cleaner@demo.com", name: "Demo Cleaner", code: "CLN-001", jobType: "CLEANER" as const },
  ];

  for (const staff of demoStaff) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      create: {
        email: staff.email,
        name: staff.name,
        passwordHash: await hash("staff123", 12),
      },
      update: { name: staff.name },
    });

    await prisma.userSchoolMembership.upsert({
      where: { userId_schoolId: { userId: user.id, schoolId: school.id } },
      create: { userId: user.id, schoolId: school.id, role: "STAFF" },
      update: { role: "STAFF", isActive: true },
    });

    await prisma.employee.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      create: {
        schoolId: school.id,
        userId: user.id,
        employeeCode: staff.code,
        jobType: staff.jobType,
        dateOfJoining: new Date("2024-06-01"),
      },
      update: { jobType: staff.jobType },
    });
  }

  const existingRoute = await prisma.transportRoute.findFirst({
    where: { schoolId: school.id, name: "Route A - North" },
  });
  if (!existingRoute) {
    await prisma.transportRoute.create({
      data: {
        schoolId: school.id,
        name: "Route A - North",
        description: "Covers northern residential areas",
        vehicleNo: "KA-01-AB-1234",
      },
    });
  }

  await prisma.userSchoolMembership.upsert({
    where: { userId_schoolId: { userId: systemAdmin.id, schoolId: school.id } },
    create: { userId: systemAdmin.id, schoolId: school.id, role: "SYSTEM_ADMIN" },
    update: {},
  });

  await prisma.userSchoolMembership.upsert({
    where: { userId_schoolId: { userId: schoolAdmin.id, schoolId: school.id } },
    create: { userId: schoolAdmin.id, schoolId: school.id, role: "SCHOOL_ADMIN" },
    update: {},
  });

  await prisma.userSchoolMembership.upsert({
    where: { userId_schoolId: { userId: parent.id, schoolId: school.id } },
    create: { userId: parent.id, schoolId: school.id, role: "PARENT" },
    update: {},
  });

  const grade = await prisma.grade.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "Grade 10" } },
    create: { schoolId: school.id, name: "Grade 10", sortOrder: 10 },
    update: {},
  });

  const sections = new Map<string, { id: string; name: string }>();
  for (const section of ["A", "B"] as const) {
    const classSection = await prisma.classSection.upsert({
      where: {
        schoolId_gradeId_section: { schoolId: school.id, gradeId: grade.id, section },
      },
      create: {
        schoolId: school.id,
        gradeId: grade.id,
        name: `Grade 10 - ${section}`,
        grade: "10",
        section,
      },
      update: { name: `Grade 10 - ${section}` },
    });
    sections.set(section, { id: classSection.id, name: classSection.name });
  }

  const subjects = new Map<string, { id: string; periodsPerWeek: number }>();
  for (const subjectDef of DEMO_SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { gradeId_name: { gradeId: grade.id, name: subjectDef.name } },
      create: {
        schoolId: school.id,
        gradeId: grade.id,
        name: subjectDef.name,
        code: subjectDef.code,
        periodsPerWeek: subjectDef.periodsPerWeek,
      },
      update: {
        code: subjectDef.code,
        periodsPerWeek: subjectDef.periodsPerWeek,
      },
    });
    subjects.set(subjectDef.name, { id: subject.id, periodsPerWeek: subject.periodsPerWeek });
  }

  const sectionA = sections.get("A");
  if (!sectionA) throw new Error("Section A missing after seed");

  const student = await prisma.student.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      schoolId: school.id,
      classSectionId: sectionA.id,
      name: "Demo Student",
      admissionNo: "STU001",
    },
    update: { classSectionId: sectionA.id },
  });

  await prisma.guardianRelationship.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    create: { schoolId: school.id, parentId: parent.id, studentId: student.id, relation: "father" },
    update: {},
  });

  await prisma.teacherAssignment.deleteMany({ where: { schoolId: school.id } });

  for (const assignment of DEMO_ASSIGNMENTS) {
    const section = sections.get(assignment.section);
    const subject = subjects.get(assignment.subject);
    const teacher = teacherUsers.get(assignment.teacherEmail);
    if (!section || !subject || !teacher) {
      throw new Error(`Missing seed data for assignment: ${JSON.stringify(assignment)}`);
    }

    await prisma.teacherAssignment.create({
      data: {
        schoolId: school.id,
        teacherId: teacher.id,
        classSectionId: section.id,
        subjectId: subject.id,
        periodsPerWeek: subject.periodsPerWeek,
      },
    });
  }

  for (let i = 1; i <= 8; i++) {
    await prisma.periodTiming.upsert({
      where: { schoolId_periodNo: { schoolId: school.id, periodNo: i } },
      create: {
        schoolId: school.id,
        periodNo: i,
        startTime: `${8 + i - 1}:00`,
        endTime: `${8 + i}:00`,
      },
      update: {},
    });
  }

  await prisma.scheduleConstraint.deleteMany({
    where: { schoolId: school.id, teacherId: { not: null } },
  });

  const existingConstraint = await prisma.scheduleConstraint.findFirst({
    where: { schoolId: school.id, teacherId: null },
  });
  if (existingConstraint) {
    await prisma.scheduleConstraint.update({
      where: { id: existingConstraint.id },
      data: {
        minFreePerWeek: DEMO_MIN_FREE_PER_WEEK,
        maxFreePerWeek: DEMO_MAX_FREE_PER_WEEK,
      },
    });
  } else {
    await prisma.scheduleConstraint.create({
      data: {
        schoolId: school.id,
        minFreePerWeek: DEMO_MIN_FREE_PER_WEEK,
        maxFreePerWeek: DEMO_MAX_FREE_PER_WEEK,
      },
    });
  }

  await prisma.schoolScheduleConfig.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      daysPerWeek: DEMO_DAYS_PER_WEEK,
      workingDays: [0, 1, 2, 3, 4],
      maxSameSubjectPerDay: 2,
      maxConsecutiveSameSubject: 3,
      requireFullSectionWeek: true,
    },
    update: {
      daysPerWeek: DEMO_DAYS_PER_WEEK,
      workingDays: [0, 1, 2, 3, 4],
      maxSameSubjectPerDay: 2,
      maxConsecutiveSameSubject: 3,
      requireFullSectionWeek: true,
    },
  });

  console.log("Seed complete!");
  console.log("System Admin: admin@classsync.app / admin123");
  console.log("School Admin: schooladmin@demo.com / school123");
  console.log("Teachers: teacher@demo.com … teacher10@demo.com / teacher123");
  console.log("Parent: parent@demo.com / parent123");
  console.log(`School ID: ${school.id}`);
  console.log("");
  console.log(`Timetable demo (${DEMO_DAYS_PER_WEEK} days × ${DEMO_PERIODS_PER_DAY} periods = ${DEMO_TOTAL_WEEKLY_SLOTS} slots/week):`);
  console.log(`  Global rules: Min Free/Week = ${DEMO_MIN_FREE_PER_WEEK}, Max Free/Week = ${DEMO_MAX_FREE_PER_WEEK}`);
  console.log("  Curriculum: 5 subjects × 8 periods = 40/section/week (full timetable)");
  console.log("  Teacher loads: 10 teachers × 8 periods/week (one subject per section)");
  console.log("  Quality rules: max 2 same-subject/day, max 3 consecutive");

  await verifyDemoSchedule(school.id);
}

async function verifyDemoSchedule(schoolId: string) {
  console.log("");
  console.log("Verifying demo timetable generation…");

  const assignments = await prisma.teacherAssignment.findMany({
    where: { schoolId },
    include: { subject: true, teacher: true, classSection: true },
  });
  const constraints = await prisma.scheduleConstraint.findMany({ where: { schoolId } });
  const periodTimings = await prisma.periodTiming.findMany({
    where: { schoolId },
    orderBy: { periodNo: "asc" },
  });
  const scheduleConfig = await prisma.schoolScheduleConfig.findUnique({ where: { schoolId } });

  const labels = {
    teachers: Object.fromEntries(assignments.map((a) => [a.teacherId, a.teacher.name])),
    sections: Object.fromEntries(assignments.map((a) => [a.classSectionId, a.classSection.name])),
    subjects: Object.fromEntries(assignments.map((a) => [a.subjectId, a.subject.name])),
  };

  const input = {
    daysPerWeek: scheduleConfig?.daysPerWeek ?? DEMO_DAYS_PER_WEEK,
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
    quality: {
      maxSameSubjectPerDay: scheduleConfig?.maxSameSubjectPerDay ?? 2,
      maxConsecutiveSameSubject: scheduleConfig?.maxConsecutiveSameSubject ?? 3,
      requireFullSectionWeek: scheduleConfig?.requireFullSectionWeek ?? true,
    },
    labels,
  };

  const feasibilityErrors = analyzeScheduleFeasibility(input, labels);
  if (feasibilityErrors.length > 0) {
    throw new Error(`Seed feasibility failed:\n${feasibilityErrors.join("\n")}`);
  }

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = solveSchedule(input);
    if (!result.success) {
      console.log(`  Attempt ${attempt}/${maxAttempts} failed`);
      continue;
    }

    const sectionIds = [...new Set(input.assignments.map((a) => a.classSectionId))];
    const qualityErrors = sectionIds.flatMap((sectionId) =>
      validateSectionScheduleQuality(
        result.slots.filter((s) => s.classSectionId === sectionId),
        sectionId,
        input,
        labels,
      ),
    );

    if (qualityErrors.length > 0) {
      console.log(`  Attempt ${attempt}/${maxAttempts} failed quality checks`);
      continue;
    }

    console.log(`  ✓ Valid schedule generated (${result.slots.length} slots, attempt ${attempt})`);
    return;
  }

  throw new Error(`Demo seed could not produce a valid timetable after ${maxAttempts} attempts`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
