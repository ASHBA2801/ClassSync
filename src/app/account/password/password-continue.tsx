"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function PasswordContinue() {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    await update({ forcePasswordChange: false });
    router.replace("/select-context");
    router.refresh();
  }

  return (
    <Button type="button" onClick={handleContinue} disabled={loading}>
      {loading ? "Continuing…" : "Continue"}
    </Button>
  );
}
