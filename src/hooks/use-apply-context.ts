"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { Role } from "@prisma/client";
import { validateContextSwitchAction } from "@/actions/auth";

export type ApplyContextInput = {
  role: Role;
  schoolId: string | null;
  activeStudentId?: string | null;
};

export function useApplyContext() {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyContext = useCallback(
    async (input: ApplyContextInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await validateContextSwitchAction(input);
        if (!result.ok) {
          setError(result.error);
          setLoading(false);
          return false;
        }

        await update({
          role: result.role,
          schoolId: result.schoolId,
          activeStudentId: result.activeStudentId,
          needsContext: false,
        });

        router.replace(result.redirectTo);
        router.refresh();
        return true;
      } catch {
        setError("Could not switch context. Please try again.");
        setLoading(false);
        return false;
      }
    },
    [update, router],
  );

  return { applyContext, loading, error, setError };
}
