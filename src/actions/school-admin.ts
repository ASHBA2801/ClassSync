"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma, withTenantContext } from "@/lib/db/prisma";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createAuditLog } from "@/lib/audit";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["SCHOOL_ADMIN", "TEACHER", "PARENT"]),
  phone: z.string().optional(),
});

export async function createSchoolUserAction(input: z.infer<typeof createUserSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.USERS_MANAGE);
  const data = createUserSchema.parse(input);
  const passwordHash = await hash(data.password, 12);

  const user = await withTenantContext(ctx.schoolId, async (tx) => {
    const created = await tx.user.upsert({
      where: { email: data.email },
      create: { email: data.email, name: data.name, passwordHash, phone: data.phone },
      update: { name: data.name, phone: data.phone },
    });

    await tx.userSchoolMembership.upsert({
      where: { userId_schoolId: { userId: created.id, schoolId: ctx.schoolId } },
      create: { userId: created.id, schoolId: ctx.schoolId, role: data.role },
      update: { role: data.role, isActive: true },
    });

    return created;
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "user.create",
    schoolId: ctx.schoolId,
    entityType: "User",
    entityId: user.id,
    metadata: { role: data.role },
  });

  return { userId: user.id };
}

export async function listSchoolUsersAction(role?: "TEACHER" | "PARENT" | "SCHOOL_ADMIN") {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.userSchoolMembership.findMany({
      where: { schoolId: ctx.schoolId, ...(role ? { role } : {}) },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

const studentSchema = z.object({
  name: z.string().min(2),
  classSectionId: z.string().uuid().optional(),
  dob: z.string().optional(),
  admissionNo: z.string().optional(),
});

export async function createStudentAction(input: z.infer<typeof studentSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.STUDENTS_MANAGE);
  const data = studentSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.student.create({
      data: {
        schoolId: ctx.schoolId,
        name: data.name,
        classSectionId: data.classSectionId,
        dob: data.dob ? new Date(data.dob) : undefined,
        admissionNo: data.admissionNo,
      },
    });
  });
}

export async function listStudentsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.student.findMany({
      include: { classSection: true, guardianRelationships: { include: { parent: true } } },
      orderBy: { name: "asc" },
    });
  });
}

const classSectionSchema = z.object({
  name: z.string().min(1),
  grade: z.string().min(1),
  section: z.string().min(1),
});

export async function createClassSectionAction(input: z.infer<typeof classSectionSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = classSectionSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.classSection.create({
      data: { schoolId: ctx.schoolId, ...data },
    });
  });
}

export async function listClassSectionsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.classSection.findMany({ orderBy: [{ grade: "asc" }, { section: "asc" }] });
  });
}

const subjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  periodsPerWeek: z.number().min(1).default(5),
});

export async function createSubjectAction(input: z.infer<typeof subjectSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = subjectSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.subject.create({ data: { schoolId: ctx.schoolId, ...data } });
  });
}

export async function listSubjectsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.subject.findMany({ orderBy: { name: "asc" } });
  });
}

const assignmentSchema = z.object({
  teacherId: z.string().uuid(),
  classSectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

export async function createTeacherAssignmentAction(input: z.infer<typeof assignmentSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = assignmentSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.teacherAssignment.create({
      data: { schoolId: ctx.schoolId, ...data },
    });
  });
}

export async function linkGuardianAction(parentId: string, studentId: string, relation = "guardian") {
  const ctx = await requireSchoolPermission(PERMISSIONS.STUDENTS_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.guardianRelationship.create({
      data: { schoolId: ctx.schoolId, parentId, studentId, relation },
    });
  });
}

const geofenceSchema = z.object({
  campusLat: z.number().min(-90).max(90),
  campusLng: z.number().min(-180).max(180),
  campusRadiusM: z.number().min(50).max(5000),
});

export async function updateGeofenceAction(input: z.infer<typeof geofenceSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.SCHOOL_MANAGE);
  const data = geofenceSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.school.update({
      where: { id: ctx.schoolId },
      data,
    });
  });
}

export async function getSchoolSettingsAction() {
  const ctx = await requireSchoolContext();
  return prisma.school.findUnique({ where: { id: ctx.schoolId } });
}
