import type { Role } from "@prisma/client";
import {
  findSchoolMembership,
  upsertSchoolMembership,
  withSystemAdminContext,
} from "@/lib/db/prisma";
import { getPermissionsForRole } from "@/lib/rbac/permissions";

export const EMPLOYEE_ROLES: Role[] = ["TEACHER", "STAFF", "SCHOOL_ADMIN"];

function dashboardPathForRole(role: Role): string {
  switch (role) {
    case "SYSTEM_ADMIN":
      return "/system";
    case "SCHOOL_ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    case "STAFF":
      return "/staff";
    case "PARENT":
      return "/parent";
    default:
      return "/";
  }
}

export type EmployeeContext = {
  kind: "employee";
  membershipId: string;
  schoolId: string;
  schoolName: string;
  role: Role;
};

export type ParentChildContext = {
  kind: "parent";
  studentId: string;
  studentName: string;
  schoolId: string;
  schoolName: string;
  classSectionName: string | null;
};

export type UserContexts = {
  employee: EmployeeContext[];
  parent: ParentChildContext[];
  hasMultiple: boolean;
  singleRedirectPath: string | null;
};

export type ContextSwitchInput = {
  role: Role;
  schoolId: string | null;
  activeStudentId?: string | null;
};

export async function listUserContexts(userId: string): Promise<UserContexts> {
  const { memberships, relationships } = await withSystemAdminContext(async (tx) => {
    const memberships = await tx.userSchoolMembership.findMany({
      where: { userId, isActive: true },
      include: { school: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    const relationships = await tx.guardianRelationship.findMany({
      where: { parentId: userId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            schoolId: true,
            classSection: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Ensure PARENT membership exists for every guardian link
    for (const rel of relationships) {
      await upsertSchoolMembership(tx, userId, rel.schoolId, "PARENT");
    }

    return { memberships, relationships };
  });

  const employee: EmployeeContext[] = memberships
    .filter((m) => EMPLOYEE_ROLES.includes(m.role) || m.role === "SYSTEM_ADMIN")
    .map((m) => ({
      kind: "employee" as const,
      membershipId: m.id,
      schoolId: m.schoolId,
      schoolName: m.school.name,
      role: m.role,
    }));

  const schoolNames = new Map(memberships.map((m) => [m.schoolId, m.school.name]));

  const parent: ParentChildContext[] = relationships.map((r) => ({
    kind: "parent" as const,
    studentId: r.student.id,
    studentName: r.student.name,
    schoolId: r.student.schoolId,
    schoolName: schoolNames.get(r.student.schoolId) ?? "School",
    classSectionName: r.student.classSection?.name ?? null,
  }));

  // Enrich school names for parent children if missing from memberships
  if (parent.some((p) => p.schoolName === "School")) {
    const missingIds = [...new Set(parent.filter((p) => p.schoolName === "School").map((p) => p.schoolId))];
    const schools = await withSystemAdminContext(async (tx) =>
      tx.school.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, name: true },
      }),
    );
    const map = new Map(schools.map((s) => [s.id, s.name]));
    for (const p of parent) {
      if (p.schoolName === "School") p.schoolName = map.get(p.schoolId) ?? "School";
    }
  }

  const hasEmployee = employee.length > 0;
  const hasParent = parent.length > 0;
  const hasMultiple =
    (hasEmployee && hasParent) ||
    employee.length > 1 ||
    parent.length > 1 ||
    (employee.length === 1 && parent.length === 1);

  let singleRedirectPath: string | null = null;
  if (!hasMultiple) {
    if (employee.length === 1 && parent.length === 0) {
      singleRedirectPath = dashboardPathForRole(employee[0]!.role);
    } else if (parent.length === 1 && employee.length === 0) {
      singleRedirectPath = dashboardPathForRole("PARENT");
    } else if (employee.length === 0 && parent.length === 0 && memberships.length === 1) {
      singleRedirectPath = dashboardPathForRole(memberships[0]!.role);
    }
  }

  return { employee, parent, hasMultiple, singleRedirectPath };
}

export async function resolveContextSwitch(
  userId: string,
  input: ContextSwitchInput,
): Promise<{
  role: Role;
  schoolId: string | null;
  activeStudentId: string | null;
  permissions: string[];
} | null> {
  const role = input.role;
  const schoolId = input.schoolId;
  const activeStudentId = input.activeStudentId ?? null;

  if (role === "SYSTEM_ADMIN") {
    const membership = await withSystemAdminContext(async (tx) =>
      tx.userSchoolMembership.findFirst({
        where: { userId, role: "SYSTEM_ADMIN", isActive: true },
      }),
    );
    if (!membership) return null;
    const permissions = await getPermissionsForRole("SYSTEM_ADMIN");
    return { role: "SYSTEM_ADMIN", schoolId: null, activeStudentId: null, permissions };
  }

  if (!schoolId) return null;

  if (role === "PARENT") {
    if (!activeStudentId) return null;

    const valid = await withSystemAdminContext(async (tx) => {
      const relationship = await tx.guardianRelationship.findFirst({
        where: {
          parentId: userId,
          studentId: activeStudentId,
          schoolId,
        },
      });
      if (!relationship) return false;

      await upsertSchoolMembership(tx, userId, schoolId, "PARENT");

      return true;
    });

    if (!valid) return null;
    const permissions = await getPermissionsForRole("PARENT");
    return { role: "PARENT", schoolId, activeStudentId, permissions };
  }

  const membership = await withSystemAdminContext(async (tx) =>
    findSchoolMembership(tx, userId, schoolId, role),
  );
  if (!membership || !membership.isActive) return null;

  const permissions = await getPermissionsForRole(role);
  return { role, schoolId, activeStudentId: null, permissions };
}

export function countSelectableContexts(contexts: UserContexts): number {
  return contexts.employee.length + contexts.parent.length;
}
