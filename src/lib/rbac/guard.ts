import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { prisma, findSchoolMembership, withSystemAdminContext } from "@/lib/db/prisma";
import { getPermissionsForRole } from "./permissions";

export interface SessionContext {
  userId: string;
  email: string;
  name: string;
  schoolId: string | null;
  role: Role;
  permissions: string[];
  activeStudentId: string | null;
  needsContext: boolean;
  forcePasswordChange: boolean;
}

async function resolveCanonicalUser(sessionUser: {
  id?: string;
  email?: string | null;
}): Promise<{ id: string; forcePasswordChange: boolean } | null> {
  if (sessionUser.email) {
    const dbUser = await withSystemAdminContext(async (tx) =>
      tx.user.findUnique({
        where: { email: sessionUser.email! },
        select: { id: true, forcePasswordChange: true },
      }),
    );
    if (dbUser) return dbUser;
  }
  if (!sessionUser.id) return null;
  return { id: sessionUser.id, forcePasswordChange: false };
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const dbUser = await resolveCanonicalUser(session.user);
  if (!dbUser) return null;

  const role = session.user.role as Role;
  // Refresh from DB on the server (Node runtime) — avoids stale JWT permissions
  const permissions = await getPermissionsForRole(role);

  return {
    userId: dbUser.id,
    email: session.user.email!,
    name: session.user.name!,
    schoolId: session.user.schoolId ?? null,
    role,
    permissions,
    activeStudentId: session.user.activeStudentId ?? null,
    needsContext: session.user.needsContext ?? false,
    forcePasswordChange: dbUser.forcePasswordChange,
  };
}

export async function requireAuth(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new UnauthorizedError();
  return ctx;
}

export async function requireSchoolPermission(
  permission: string,
): Promise<SessionContext & { schoolId: string }> {
  const ctx = await requireSchoolContext();
  if (!ctx.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return ctx;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionContext> {
  const ctx = await requireAuth();
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(`Role ${ctx.role} is not authorized`);
  }
  return ctx;
}

export async function requirePermission(permission: string): Promise<SessionContext> {
  const ctx = await requireAuth();
  if (!ctx.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return ctx;
}

export async function requireSchoolContext(): Promise<SessionContext & { schoolId: string }> {
  const ctx = await requireAuth();

  const memberships = await withSystemAdminContext(async (tx) =>
    tx.userSchoolMembership.findMany({
      where: { userId: ctx.userId, isActive: true },
      select: { schoolId: true, role: true },
    }),
  );

  if (memberships.length === 0) {
    redirect("/login");
  }

  let schoolId: string | null = null;

  if (ctx.schoolId) {
    const matchingMembership = memberships.find(
      (membership) =>
        membership.schoolId === ctx.schoolId && membership.role === ctx.role,
    );
    if (matchingMembership) {
      schoolId = matchingMembership.schoolId;
    }
  }

  if (!schoolId) {
    const roleMembership = memberships.find((membership) => membership.role === ctx.role);
    schoolId = roleMembership?.schoolId ?? null;
  }

  if (!schoolId) {
    redirect("/select-context");
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });
  if (!school) {
    redirect("/select-context");
  }

  return { ...ctx, schoolId };
}

export async function revalidateSessionForSensitiveOp(
  userId: string,
  schoolId: string,
  role: Role,
) {
  const membership = await withSystemAdminContext(async (tx) =>
    findSchoolMembership(tx, userId, schoolId, role),
  );
  if (!membership || !membership.isActive) {
    throw new ForbiddenError("Membership no longer valid");
  }
  const permissions = await getPermissionsForRole(membership.role);
  return { role: membership.role, permissions };
}

export function getRoleDashboardPath(role: Role): string {
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
