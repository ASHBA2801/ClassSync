"use client";

import { Button } from "@/components/ui/button";
import { useApplyContext } from "@/hooks/use-apply-context";

export function SwitchChildButton({
  schoolId,
  studentId,
  label = "Switch",
}: {
  schoolId: string;
  studentId: string;
  label?: string;
}) {
  const { applyContext, loading } = useApplyContext();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() =>
        void applyContext({
          role: "PARENT",
          schoolId,
          activeStudentId: studentId,
        })
      }
    >
      {label}
    </Button>
  );
}
