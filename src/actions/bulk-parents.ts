"use server";

import { revalidatePath } from "next/cache";
import { requireSchoolContext, requireSchoolPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { withTenantContext } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { importBulkParentsFromCsv } from "@/lib/parents/import";
import type { BulkParentImportResult } from "@/lib/parents/types";

export async function listSchoolParentsAction() {
  const ctx = await requireSchoolContext();
  return withTenantContext(ctx.schoolId, async (tx) => {
    return tx.userSchoolMembership.findMany({
      where: { schoolId: ctx.schoolId, role: "PARENT", isActive: true },
      include: {
        user: {
          include: {
            guardianRelationships: {
              where: { schoolId: ctx.schoolId },
              include: { student: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function importBulkParentsAction(formData: FormData): Promise<BulkParentImportResult> {
  const ctx = await requireSchoolPermission(PERMISSIONS.USERS_MANAGE);
  if (!ctx.permissions.includes(PERMISSIONS.STUDENTS_MANAGE)) {
    throw new Error("Missing permission to create student profiles");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a completed CSV template to upload.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File is too large. Maximum size is 2 MB.");
  }

  const csvText = await file.text();
  const school = await withTenantContext(ctx.schoolId, async (tx) =>
    tx.school.findUnique({ where: { id: ctx.schoolId }, select: { name: true } }),
  );
  if (!school) throw new Error("School not found");

  const result = await importBulkParentsFromCsv(csvText, {
    schoolId: ctx.schoolId,
    schoolName: school.name,
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "parent.bulk_import",
    schoolId: ctx.schoolId,
    entityType: "User",
    metadata: {
      usersCreated: result.summary.usersCreated,
      usersRoleAdded: result.summary.usersRoleAdded,
      studentsCreated: result.summary.studentsCreated,
      failed: result.summary.failed,
    },
  });

  revalidatePath("/admin/parents");
  revalidatePath("/admin/students");
  return result;
}
