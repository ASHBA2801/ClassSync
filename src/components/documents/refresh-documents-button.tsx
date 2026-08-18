"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOLDOWN_SECONDS = 6;

export function RefreshDocumentsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function handleRefresh() {
    if (cooldown > 0 || pending) return;
    startTransition(() => {
      router.refresh();
    });
    setCooldown(COOLDOWN_SECONDS);
  }

  const waiting = cooldown > 0;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={pending || waiting}
      aria-label={waiting ? `Refresh available in ${cooldown} seconds` : "Refresh document status"}
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {waiting ? `Refresh in ${cooldown}s` : "Refresh"}
    </Button>
  );
}
