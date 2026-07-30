"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { getRoleDashboardPath } from "@/lib/rbac/guard";
import type { Role } from "@prisma/client";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const schoolId = formData.get("schoolId") as string | undefined;

  try {
    const result = await signIn("credentials", {
      email,
      password,
      schoolId: schoolId || undefined,
      redirect: false,
    });

    if (result?.error) {
      return { error: "Invalid credentials" };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Authentication failed" };
    }
    throw error;
  }
}

export function getDashboardPathForRole(role: Role) {
  return getRoleDashboardPath(role);
}
