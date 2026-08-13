"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { requireAuth, getRoleDashboardPath } from "@/lib/rbac/guard";
import {
  listUserContexts,
  type UserContexts,
  type ContextSwitchInput,
} from "@/lib/auth/contexts";
import { resolveContextSwitch } from "@/lib/auth/contexts";

export async function credentialsSignInAction(input: {
  email: string;
  password: string;
  schoolId?: string;
}) {
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      schoolId: input.schoolId,
      // Always land on context resolver; it redirects to dashboard or picker
      redirectTo: "/select-context",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function listUserContextsAction(): Promise<UserContexts> {
  const ctx = await requireAuth();
  return listUserContexts(ctx.userId);
}

export async function resolveContextDestinationAction(options?: {
  forcePicker?: boolean;
}): Promise<{
  needsPicker: boolean;
  redirectTo: string;
  contexts: UserContexts;
  defaultSwitch: ContextSwitchInput | null;
}> {
  const ctx = await requireAuth();
  const contexts = await listUserContexts(ctx.userId);
  const forcePicker = options?.forcePicker === true;

  if (!contexts.hasMultiple && contexts.singleRedirectPath && !forcePicker) {
    let defaultSwitch: ContextSwitchInput | null = null;

    if (contexts.parent.length === 1 && contexts.employee.length === 0) {
      const child = contexts.parent[0]!;
      defaultSwitch = {
        role: "PARENT",
        schoolId: child.schoolId,
        activeStudentId: child.studentId,
      };
    } else if (contexts.employee.length === 1 && contexts.parent.length === 0) {
      const emp = contexts.employee[0]!;
      defaultSwitch = {
        role: emp.role,
        schoolId: emp.role === "SYSTEM_ADMIN" ? null : emp.schoolId,
        activeStudentId: null,
      };
    }

    return {
      needsPicker: false,
      redirectTo: contexts.singleRedirectPath,
      contexts,
      defaultSwitch,
    };
  }

  // Mid-session switch, or login with multiple contexts
  if (forcePicker || ctx.needsContext || contexts.hasMultiple) {
    return {
      needsPicker: true,
      redirectTo: "/select-context",
      contexts,
      defaultSwitch: null,
    };
  }

  return {
    needsPicker: false,
    redirectTo: getRoleDashboardPath(ctx.role),
    contexts,
    defaultSwitch: null,
  };
}

/** Server-side validation helper used by client before session.update */
export async function validateContextSwitchAction(input: ContextSwitchInput) {
  const ctx = await requireAuth();
  const resolved = await resolveContextSwitch(ctx.userId, input);
  if (!resolved) {
    return { ok: false as const, error: "Invalid context selection." };
  }
  return {
    ok: true as const,
    role: resolved.role,
    schoolId: resolved.schoolId,
    activeStudentId: resolved.activeStudentId,
    redirectTo: getRoleDashboardPath(resolved.role),
  };
}
