import { auth } from "@/lib/auth";
import type { NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth", "/offline"];

const roleRoutes: Record<string, string[]> = {
  SYSTEM_ADMIN: ["/system"],
  SCHOOL_ADMIN: ["/admin"],
  TEACHER: ["/teacher"],
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
  const allowedPrefixes = roleRoutes[role] ?? [];

  if (pathname === "/") {
    const dashboardMap: Record<string, string> = {
      SYSTEM_ADMIN: "/system",
      SCHOOL_ADMIN: "/admin",
      TEACHER: "/teacher",
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)"],
};
