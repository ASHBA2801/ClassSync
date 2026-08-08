"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startPayrollPayoutAction } from "@/actions/payroll";
import { Button } from "@/components/ui/button";

interface Props {
  payrollRunId: string;
  status: string;
}

export function PayrollRunActions({ payrollRunId, status }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function startPayout() {
    setError("");
    setMessage("");
    try {
      const result = await startPayrollPayoutAction(payrollRunId);
      setMessage(
        `Payout started: ${result.successCount} succeeded, ${result.failCount} failed.` +
        (result.errors.length > 0 ? ` ${result.errors.join("; ")}` : ""),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout failed");
    }
  }

  if (status !== "DRAFT" && status !== "APPROVED") return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Button onClick={startPayout}>Start Payout via RazorpayX</Button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
    </div>
  );
}
