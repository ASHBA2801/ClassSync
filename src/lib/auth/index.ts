import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPermissionsForRole } from "@/lib/rbac/permissions";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    schoolId: string | null;
    permissions: string[];
  }

  interface Session {
    user: User & {
      email: string;
      name: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    schoolId: string | null;
    permissions: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            memberships: {
              where: { isActive: true },
              include: { school: true },
            },
          },
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

        const permissions = await getPermissionsForRole(membership.role);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          schoolId: membership.role === "SYSTEM_ADMIN" ? null : membership.schoolId,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.schoolId = user.schoolId;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.schoolId = token.schoolId;
      session.user.permissions = token.permissions;
      return session;
    },
  },
});
