import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { withSystemAdminContext } from "@/lib/db/prisma";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { authConfig } from "@/lib/auth/config";
import {
  countSelectableContexts,
  listUserContexts,
  resolveContextSwitch,
} from "@/lib/auth/contexts";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    schoolId: string | null;
    permissions: string[];
    activeStudentId?: string | null;
    needsContext?: boolean;
    forcePasswordChange?: boolean;
  }

  interface Session {
    user: User & {
      email: string;
      name: string;
      sessionStarted?: number;
      activeStudentId?: string | null;
      needsContext?: boolean;
      forcePasswordChange?: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    schoolId: string | null;
    permissions: string[];
    activeStudentId?: string | null;
    needsContext?: boolean;
    forcePasswordChange?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        schoolId: { label: "School ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await withSystemAdminContext(async (tx) => {
          return tx.user.findUnique({
            where: { email: credentials.email as string },
            include: {
              memberships: {
                where: { isActive: true },
                include: { school: true },
              },
            },
          });
        });

        if (!user) return null;

        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        const requestedSchoolId = credentials.schoolId as string | undefined;
        let membership = user.memberships[0];

        if (requestedSchoolId) {
          membership =
            user.memberships.find((m) => m.schoolId === requestedSchoolId) ?? membership;
        }

        if (!membership) {
          const systemAdminMembership = user.memberships.find(
            (m) => m.role === "SYSTEM_ADMIN",
          );
          if (systemAdminMembership) membership = systemAdminMembership;
        }

        if (!membership) return null;

        const contexts = await listUserContexts(user.id);
        const needsContext = countSelectableContexts(contexts) > 1 || contexts.hasMultiple;

        let role = membership.role;
        let schoolId: string | null =
          membership.role === "SYSTEM_ADMIN" ? null : membership.schoolId;
        let activeStudentId: string | null = null;

        // Auto-apply single context so middleware can skip the picker
        if (!needsContext) {
          if (contexts.parent.length === 1 && contexts.employee.length === 0) {
            const child = contexts.parent[0]!;
            role = "PARENT";
            schoolId = child.schoolId;
            activeStudentId = child.studentId;
          } else if (contexts.employee.length === 1 && contexts.parent.length === 0) {
            const emp = contexts.employee[0]!;
            role = emp.role;
            schoolId = emp.role === "SYSTEM_ADMIN" ? null : emp.schoolId;
          }
        }

        const permissions = await getPermissionsForRole(role);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
          schoolId,
          permissions,
          activeStudentId,
          needsContext,
          forcePasswordChange: user.forcePasswordChange,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.sub = user.id;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.permissions = user.permissions;
        token.activeStudentId = user.activeStudentId ?? null;
        token.needsContext = user.needsContext ?? false;
        token.forcePasswordChange = user.forcePasswordChange ?? false;
      }

      if (trigger === "update" && session) {
        const input = session as {
          role?: Role;
          schoolId?: string | null;
          activeStudentId?: string | null;
          needsContext?: boolean;
          forcePasswordChange?: boolean;
        };

        if (input.forcePasswordChange !== undefined) {
          token.forcePasswordChange = input.forcePasswordChange;
        }

        if (input.role !== undefined) {
          const resolved = await resolveContextSwitch(token.id ?? token.sub!, {
            role: input.role,
            schoolId: input.schoolId ?? null,
            activeStudentId: input.activeStudentId,
          });
          if (resolved) {
            token.role = resolved.role;
            token.schoolId = resolved.schoolId;
            token.activeStudentId = resolved.activeStudentId;
            token.permissions = resolved.permissions;
            token.needsContext = false;
          }
        } else if (input.needsContext === false) {
          token.needsContext = false;
        }
      }

      return token;
    },
  },
});
