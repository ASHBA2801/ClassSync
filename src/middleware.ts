import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/api/auth", "/offline"];

const roleRoutes: Record<string, string[]> = {
  SYSTEM_ADMIN: ["/system"],
  SCHOOL_ADMIN: ["/admin"],
  TEACHER: ["/teacher"],
  STAFF: ["/staff"],
  PARENT: ["/parent"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session.user.role;
  const needsContext = session.user.needsContext === true;
  const forcePasswordChange = session.user.forcePasswordChange === true;

  if (forcePasswordChange) {
    if (pathname.startsWith("/account/password") || pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/account/password", req.url));
  }

  // Context picker is always reachable while authenticated
  if (pathname.startsWith("/select-context")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    // Still allow account while needsContext so they can sign out / change password
    return NextResponse.next();
  }

  if (needsContext) {
    return NextResponse.redirect(new URL("/select-context", req.url));
  }

  const allowedPrefixes = roleRoutes[role] ?? [];

  if (pathname === "/") {
    const dashboardMap: Record<string, string> = {
      SYSTEM_ADMIN: "/system",
      SCHOOL_ADMIN: "/admin",
      TEACHER: "/teacher",
      STAFF: "/staff",
      PARENT: "/parent",
    };
    return NextResponse.redirect(new URL(dashboardMap[role] ?? "/login", req.url));
  }

  const hasAccess =
    role === "SYSTEM_ADMIN" ||
    allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|images).*)"],
};
