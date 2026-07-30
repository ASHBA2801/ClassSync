import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const PERMISSIONS = {
  SCHOOL_MANAGE: "school:manage",
  USERS_MANAGE: "users:manage",
  STUDENTS_MANAGE: "students:manage",
  CLASSES_MANAGE: "classes:manage",
  SCHEDULE_MANAGE: "schedule:manage",
  SCHEDULE_VIEW: "schedule:view",
  ATTENDANCE_MARK: "attendance:mark",
  ATTENDANCE_VIEW: "attendance:view",
  ATTENDANCE_OVERRIDE: "attendance:override",
  LEAVE_MANAGE: "leave:manage",
  LEAVE_REQUEST: "leave:request",
  DOCUMENTS_UPLOAD: "documents:upload",
  DOCUMENTS_REVIEW: "documents:review",
  FEES_MANAGE: "fees:manage",
  FEES_PAY: "fees:pay",
  PAYMENTS_CONFIGURE: "payments:configure",
  SYSTEM_ADMIN: "system:admin",
  AUDIT_VIEW: "audit:view",
  MONITORING_VIEW: "monitoring:view",
  AI_KEYS_MANAGE: "ai:keys:manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  SYSTEM_ADMIN: Object.values(PERMISSIONS),
  SCHOOL_ADMIN: [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.STUDENTS_MANAGE,
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SCHEDULE_MANAGE,
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_OVERRIDE,
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.DOCUMENTS_REVIEW,
    PERMISSIONS.FEES_MANAGE,
    PERMISSIONS.PAYMENTS_CONFIGURE,
    PERMISSIONS.AUDIT_VIEW,
  ],
  TEACHER: [
    PERMISSIONS.SCHEDULE_VIEW,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.LEAVE_REQUEST,
  ],
  PARENT: [
    PERMISSIONS.DOCUMENTS_UPLOAD,
    PERMISSIONS.LEAVE_REQUEST,
    PERMISSIONS.FEES_PAY,
  ],
};

export async function getPermissionsForRole(role: Role): Promise<string[]> {
  const rolePerms = await prisma.rolePermission.findMany({
    where: { role },
    include: { permission: true },
  });

  if (rolePerms.length === 0) {
    return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  }

  return rolePerms.map((rp) => rp.permission.key);
}

export async function seedPermissions() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: key.replace(/:/g, " ") },
      update: {},
    });
  }

  for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permKey of perms) {
      const permission = await prisma.permission.findUnique({ where: { key: permKey } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as Role, permissionId: permission.id } },
        create: { role: role as Role, permissionId: permission.id },
        update: {},
      });
    }
  }
}
