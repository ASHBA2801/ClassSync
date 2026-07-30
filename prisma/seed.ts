import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";
import { seedPermissions } from "../src/lib/rbac/permissions";

async function main() {
  console.log("Seeding permissions...");
  await seedPermissions();

  const passwordHash = await hash("admin123", 12);

  const systemAdmin = await prisma.user.upsert({
    where: { email: "admin@classsync.app" },
    create: {
      email: "admin@classsync.app",
      name: "System Admin",
      passwordHash,
    },
    update: {},
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
    update: {},
  });

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@demo.com" },
    create: {
      email: "teacher@demo.com",
      name: "Demo Teacher",
      passwordHash: await hash("teacher123", 12),
    },
    update: {},
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent@demo.com" },
    create: {
      email: "parent@demo.com",
      name: "Demo Parent",
      passwordHash: await hash("parent123", 12),
    },
    update: {},
  });

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
    where: { userId_schoolId: { userId: teacher.id, schoolId: school.id } },
    create: { userId: teacher.id, schoolId: school.id, role: "TEACHER" },
    update: {},
  });

  await prisma.userSchoolMembership.upsert({
    where: { userId_schoolId: { userId: parent.id, schoolId: school.id } },
    create: { userId: parent.id, schoolId: school.id, role: "PARENT" },
    update: {},
  });

  const classSection = await prisma.classSection.upsert({
    where: { schoolId_grade_section: { schoolId: school.id, grade: "10", section: "A" } },
    create: { schoolId: school.id, name: "Grade 10-A", grade: "10", section: "A" },
    update: {},
  });

  const subject = await prisma.subject.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "Mathematics" } },
    create: { schoolId: school.id, name: "Mathematics", code: "MATH", periodsPerWeek: 5 },
    update: {},
  });

  const student = await prisma.student.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      schoolId: school.id,
      classSectionId: classSection.id,
      name: "Demo Student",
      admissionNo: "STU001",
    },
    update: {},
  });

  await prisma.guardianRelationship.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    create: { schoolId: school.id, parentId: parent.id, studentId: student.id, relation: "father" },
    update: {},
  });

  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_classSectionId_subjectId: {
        teacherId: teacher.id,
        classSectionId: classSection.id,
        subjectId: subject.id,
      },
    },
    create: {
      schoolId: school.id,
      teacherId: teacher.id,
      classSectionId: classSection.id,
      subjectId: subject.id,
    },
    update: {},
  });

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

  await prisma.scheduleConstraint.upsert({
    where: { schoolId_teacherId: { schoolId: school.id, teacherId: null as unknown as string } },
    create: { schoolId: school.id, minFreePeriods: 1, maxFreePeriods: 3 },
    update: {},
  }).catch(async () => {
    const existing = await prisma.scheduleConstraint.findFirst({
      where: { schoolId: school.id, teacherId: null },
    });
    if (!existing) {
      await prisma.scheduleConstraint.create({
        data: { schoolId: school.id, minFreePeriods: 1, maxFreePeriods: 3 },
      });
    }
  });

  console.log("Seed complete!");
  console.log("System Admin: admin@classsync.app / admin123");
  console.log("School Admin: schooladmin@demo.com / school123");
  console.log("Teacher: teacher@demo.com / teacher123");
  console.log("Parent: parent@demo.com / parent123");
  console.log(`School ID: ${school.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
