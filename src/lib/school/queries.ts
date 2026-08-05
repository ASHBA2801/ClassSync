import { withTenantContext } from "@/lib/db/prisma";

export async function getGradeForSchool(schoolId: string, gradeId: string) {
  return withTenantContext(schoolId, async (tx) => {
    return tx.grade.findFirst({
      where: { id: gradeId, schoolId },
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

export async function getSectionForSchool(schoolId: string, sectionId: string) {
  return withTenantContext(schoolId, async (tx) => {
    return tx.classSection.findFirst({
      where: { id: sectionId, schoolId },
      include: {
        gradeRef: true,
        teacherAssignments: {
          include: { teacher: true, subject: true },
        },
      },
    });
  });
}
