import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { getPermissionsForRole } from "./permissions";

export interface SessionContext {
  userId: string;
  email: string;
  name: string;
  schoolId: string | null;
  role: Role;
  permissions: string[];
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    userId: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    schoolId: session.user.schoolId ?? null,
    role: session.user.role as Role,
    permissions: session.user.permissions ?? [],
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
  if (!ctx.schoolId) {
    throw new ForbiddenError("School context required");
  }
  return ctx as SessionContext & { schoolId: string };
}

export async function revalidateSessionForSensitiveOp(userId: string, schoolId: string) {
  const membership = await prisma.userSchoolMembership.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
  });
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
    case "PARENT":
      return "/parent";
    default:
      return "/";
  }
}
