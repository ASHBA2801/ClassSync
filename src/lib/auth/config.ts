import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. Keep this free of Node-only imports
 * (Prisma, bcrypt, etc.) so middleware stays under Vercel's 1 MB limit.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
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
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id ?? token.sub;
      session.user.role = token.role;
      session.user.schoolId = token.schoolId;
      session.user.permissions = token.permissions;
      session.user.activeStudentId = token.activeStudentId ?? null;
      session.user.needsContext = token.needsContext ?? false;
      session.user.forcePasswordChange = token.forcePasswordChange ?? false;
      if (token.iat) {
        session.user.sessionStarted = token.iat * 1000;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
