"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCorePricingPlanActiveAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";

export function PlanVisibilityToggle({
  planId,
  isActive,
}: {
  planId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setCorePricingPlanActiveAction(planId, !isActive);
          router.refresh();
        });
      }}
    >
      {isActive ? "Hide" : "Show"}
    </Button>
  );
}
