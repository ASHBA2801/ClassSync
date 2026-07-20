import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnv({ path: resolve(import.meta.dirname, '../../../.env') });
loadEnv({ path: resolve(import.meta.dirname, '../../.env') });
loadEnv();

/**
 * ClassSync seed script
 *
 * BEFORE RUNNING:
 * 1. Create users in Supabase Dashboard → Authentication → Users (Email/Password):
 *    - one SUPER_ADMIN (platform), one school ADMIN, one TEACHER, one PARENT
 * 2. Copy each user's UUID into .env:
 *    SEED_SUPER_ADMIN_USER_ID=
 *    SEED_ADMIN_USER_ID=
 *    SEED_TEACHER_USER_ID=
 *    SEED_PARENT_USER_ID=
 * 3. Ensure DATABASE_URL (pooled) and DIRECT_URL are set.
 * 4. Run: pnpm db:migrate && pnpm db:seed
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Create Supabase Auth users first, then set SEED_*_USER_ID in .env.`,
    );
  }
  return value;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for seeding.');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const superAdminId = requireEnv('SEED_SUPER_ADMIN_USER_ID');
  const adminId = requireEnv('SEED_ADMIN_USER_ID');
  const teacherId = requireEnv('SEED_TEACHER_USER_ID');
  const parentId = requireEnv('SEED_PARENT_USER_ID');

  console.log('Seeding platform SUPER_ADMIN + Riverside Academy demo data...');

  // Platform operator — no tenantId (manages all schools)
  const superAdmin = await prisma.profile.upsert({
    where: { id: superAdminId },
    update: {
      tenantId: null,
      email: 'superadmin@classsync.app',
      role: 'SUPER_ADMIN',
      name: 'Alex Rivera',
    },
    create: {
      id: superAdminId,
      tenantId: null,
      email: 'superadmin@classsync.app',
      role: 'SUPER_ADMIN',
      name: 'Alex Rivera',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'riverside' },
    update: {},
    create: {
      name: 'Riverside Academy',
      subdomain: 'riverside',
      subscriptionTier: 'STANDARD',
    },
  });

  const admin = await prisma.profile.upsert({
    where: { id: adminId },
    update: {
      tenantId: tenant.id,
      email: 'admin@riverside.academy',
      role: 'ADMIN',
      name: 'Priya Sharma',
    },
    create: {
      id: adminId,
      tenantId: tenant.id,
      email: 'admin@riverside.academy',
      role: 'ADMIN',
      name: 'Priya Sharma',
    },
  });

  const teacher = await prisma.profile.upsert({
    where: { id: teacherId },
    update: {
      tenantId: tenant.id,
      email: 'teacher@riverside.academy',
      role: 'TEACHER',
      name: 'James Okonkwo',
    },
    create: {
      id: teacherId,
      tenantId: tenant.id,
      email: 'teacher@riverside.academy',
      role: 'TEACHER',
      name: 'James Okonkwo',
    },
  });

  const parent = await prisma.profile.upsert({
    where: { id: parentId },
    update: {
      tenantId: tenant.id,
      email: 'parent@riverside.academy',
      role: 'PARENT',
      name: 'Aisha Patel',
    },
    create: {
      id: parentId,
      tenantId: tenant.id,
      email: 'parent@riverside.academy',
      role: 'PARENT',
      name: 'Aisha Patel',
    },
  });

  const classRoom = await prisma.class.upsert({
    where: { id: 'seed-class-year5-a' },
    update: {
      tenantId: tenant.id,
      name: 'Year 5 — Maple',
      gradeLevel: '5',
      teacherProfileId: teacher.id,
    },
    create: {
      id: 'seed-class-year5-a',
      tenantId: tenant.id,
      name: 'Year 5 — Maple',
      gradeLevel: '5',
      teacherProfileId: teacher.id,
    },
  });

  const student = await prisma.student.upsert({
    where: {
      tenantId_admissionNumber: {
        tenantId: tenant.id,
        admissionNumber: 'RA-2024-0142',
      },
    },
    update: {
      name: 'Rohan Patel',
      classId: classRoom.id,
      dateOfBirth: new Date('2015-03-18'),
    },
    create: {
      tenantId: tenant.id,
      name: 'Rohan Patel',
      admissionNumber: 'RA-2024-0142',
      classId: classRoom.id,
      dateOfBirth: new Date('2015-03-18'),
    },
  });

  await prisma.parentStudent.upsert({
    where: {
      tenantId_parentProfileId_studentId: {
        tenantId: tenant.id,
        parentProfileId: parent.id,
        studentId: student.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      parentProfileId: parent.id,
      studentId: student.id,
    },
  });

  const attendanceDate = new Date('2026-07-14');

  await prisma.attendance.upsert({
    where: {
      tenantId_studentId_date: {
        tenantId: tenant.id,
        studentId: student.id,
        date: attendanceDate,
      },
    },
    update: {
      status: 'PRESENT',
      markedByProfileId: teacher.id,
    },
    create: {
      tenantId: tenant.id,
      studentId: student.id,
      date: attendanceDate,
      status: 'PRESENT',
      markedByProfileId: teacher.id,
    },
  });

  const existingGrade = await prisma.grade.findFirst({
    where: {
      tenantId: tenant.id,
      studentId: student.id,
      subject: 'Mathematics',
      date: new Date('2026-07-10'),
    },
  });

  if (!existingGrade) {
    await prisma.grade.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        subject: 'Mathematics',
        marks: 42,
        maxMarks: 50,
        date: new Date('2026-07-10'),
      },
    });
  }

  console.log('Seed complete.');
  console.log({
    superAdmin: superAdmin.email,
    tenant: tenant.name,
    schoolAdmin: admin.email,
    teacher: teacher.email,
    parent: parent.email,
    student: student.name,
    class: classRoom.name,
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
