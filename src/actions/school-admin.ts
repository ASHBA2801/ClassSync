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

const gradeSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export async function createGradeAction(input: z.infer<typeof gradeSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = gradeSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.grade.create({
      data: { schoolId: ctx.schoolId, name: data.name, sortOrder: data.sortOrder },
    });
  });
}

export async function updateGradeAction(
  gradeId: string,
  input: z.infer<typeof gradeSchema>,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = gradeSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const grade = await tx.grade.findFirst({
      where: { id: gradeId, schoolId: ctx.schoolId },
    });
    if (!grade) throw new Error("Grade not found");

    return tx.grade.update({
      where: { id: gradeId },
      data: { name: data.name, sortOrder: data.sortOrder },
    });
  });
}

export async function deleteGradeAction(gradeId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const grade = await tx.grade.findFirst({
      where: { id: gradeId, schoolId: ctx.schoolId },
      include: { _count: { select: { classSections: true } } },
    });
    if (!grade) throw new Error("Grade not found");
    if (grade._count.classSections > 0) {
      throw new Error("Cannot delete grade with existing sections");
    }

    await tx.subject.deleteMany({ where: { gradeId } });
    return tx.grade.delete({ where: { id: gradeId } });
  });
}

export async function listGradesAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.grade.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            classSections: true,
            subjects: true,
          },
        },
        classSections: {
          include: { _count: { select: { students: true } } },
        },
      },
    });
  });
}

export async function getGradeAction(gradeId: string) {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.grade.findFirst({
      where: { id: gradeId, schoolId: ctx.schoolId },
      include: {
        classSections: {
          orderBy: { section: "asc" },
          include: { _count: { select: { students: true } } },
        },
        subjects: {
          orderBy: { name: "asc" },
        },
      },
    });
  });
}

const sectionSchema = z.object({
  gradeId: z.string().uuid(),
  section: z.string().min(1),
});

export async function createSectionAction(input: z.infer<typeof sectionSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = sectionSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const grade = await tx.grade.findFirst({
      where: { id: data.gradeId, schoolId: ctx.schoolId },
    });
    if (!grade) throw new Error("Grade not found");

    const gradeLabel = grade.name.replace(/^Grade\s+/i, "");
    const name = `${grade.name} - ${data.section}`;

    return tx.classSection.create({
      data: {
        schoolId: ctx.schoolId,
        gradeId: data.gradeId,
        name,
        grade: gradeLabel,
        section: data.section,
      },
    });
  });
}

export async function updateSectionAction(
  sectionId: string,
  input: { section: string },
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = z.object({ section: z.string().min(1) }).parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const existing = await tx.classSection.findFirst({
      where: { id: sectionId, schoolId: ctx.schoolId },
      include: { gradeRef: true },
    });
    if (!existing) throw new Error("Section not found");

    const gradeLabel = existing.gradeRef.name.replace(/^Grade\s+/i, "");
    const name = `${existing.gradeRef.name} - ${data.section}`;

    return tx.classSection.update({
      where: { id: sectionId },
      data: { section: data.section, name, grade: gradeLabel },
    });
  });
}

export async function deleteSectionAction(sectionId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const section = await tx.classSection.findFirst({
      where: { id: sectionId, schoolId: ctx.schoolId },
      include: { _count: { select: { students: true } } },
    });
    if (!section) throw new Error("Section not found");
    if (section._count.students > 0) {
      throw new Error("Cannot delete section with enrolled students");
    }

    return tx.classSection.delete({ where: { id: sectionId } });
  });
}

export async function listSectionsByGradeAction(gradeId: string) {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.classSection.findMany({
      where: { gradeId, schoolId: ctx.schoolId },
      orderBy: { section: "asc" },
      include: { _count: { select: { students: true } } },
    });
  });
}

export async function getSectionAction(sectionId: string) {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.classSection.findFirst({
      where: { id: sectionId, schoolId: ctx.schoolId },
      include: {
        gradeRef: true,
        teacherAssignments: {
          include: { teacher: true, subject: true },
        },
      },
    });
  });
}

const subjectSchema = z.object({
  gradeId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional(),
  periodsPerWeek: z.number().min(1).default(5),
});

const updateSubjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  periodsPerWeek: z.number().min(1),
});

export async function createSubjectAction(input: z.infer<typeof subjectSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = subjectSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const grade = await tx.grade.findFirst({
      where: { id: data.gradeId, schoolId: ctx.schoolId },
    });
    if (!grade) throw new Error("Grade not found");

    return tx.subject.create({
      data: { schoolId: ctx.schoolId, ...data },
    });
  });
}

export async function updateSubjectAction(
  subjectId: string,
  input: z.infer<typeof updateSubjectSchema>,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = updateSubjectSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const subject = await tx.subject.findFirst({
      where: { id: subjectId, schoolId: ctx.schoolId },
    });
    if (!subject) throw new Error("Subject not found");

    return tx.subject.update({
      where: { id: subjectId },
      data,
    });
  });
}

export async function deleteSubjectAction(subjectId: string) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const subject = await tx.subject.findFirst({
      where: { id: subjectId, schoolId: ctx.schoolId },
      include: { _count: { select: { teacherAssignments: true } } },
    });
    if (!subject) throw new Error("Subject not found");
    if (subject._count.teacherAssignments > 0) {
      throw new Error("Cannot delete subject with teacher assignments");
    }

    return tx.subject.delete({ where: { id: subjectId } });
  });
}

export async function listSubjectsByGradeAction(gradeId: string) {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.subject.findMany({
      where: { gradeId, schoolId: ctx.schoolId },
      orderBy: { name: "asc" },
    });
  });
}

/** @deprecated Use listSubjectsByGradeAction */
export async function listGradeSubjectsAction(gradeId: string) {
  const subjects = await listSubjectsByGradeAction(gradeId);
  return subjects.map((s) => ({
    subjectId: s.id,
    periodsPerWeek: s.periodsPerWeek,
    subject: { id: s.id, name: s.name },
  }));
}

export async function listClassSectionsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.classSection.findMany({
      orderBy: [{ gradeRef: { sortOrder: "asc" } }, { section: "asc" }],
      include: { gradeRef: true },
    });
  });
}

const assignmentSchema = z.object({
  teacherId: z.string().uuid(),
  classSectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  periodsPerWeek: z.number().min(1).optional(),
});

export async function upsertTeacherAssignmentAction(input: z.infer<typeof assignmentSchema>) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);
  const data = assignmentSchema.parse(input);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const section = await tx.classSection.findFirst({
      where: { id: data.classSectionId, schoolId: ctx.schoolId },
    });
    if (!section) throw new Error("Section not found");

    const subject = await tx.subject.findFirst({
      where: { id: data.subjectId, schoolId: ctx.schoolId },
    });
    if (!subject) throw new Error("Subject not found");
    if (subject.gradeId !== section.gradeId) {
      throw new Error("Subject does not belong to this section's grade");
    }

    await tx.teacherAssignment.deleteMany({
      where: {
        schoolId: ctx.schoolId,
        classSectionId: data.classSectionId,
        subjectId: data.subjectId,
      },
    });

    return tx.teacherAssignment.create({
      data: {
        schoolId: ctx.schoolId,
        teacherId: data.teacherId,
        classSectionId: data.classSectionId,
        subjectId: data.subjectId,
        periodsPerWeek: data.periodsPerWeek,
      },
    });
  });
}

export async function deleteTeacherAssignmentAction(
  classSectionId: string,
  subjectId: string,
) {
  const ctx = await requireSchoolPermission(PERMISSIONS.CLASSES_MANAGE);

  return withTenantContext(ctx.schoolId, async (tx) => {
    const assignment = await tx.teacherAssignment.findFirst({
      where: {
        classSectionId,
        subjectId,
        schoolId: ctx.schoolId,
      },
    });
    if (!assignment) throw new Error("Assignment not found");

    return tx.teacherAssignment.delete({ where: { id: assignment.id } });
  });
}

/** @deprecated Use upsertTeacherAssignmentAction */
export async function createTeacherAssignmentAction(input: z.infer<typeof assignmentSchema>) {
  return upsertTeacherAssignmentAction(input);
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
