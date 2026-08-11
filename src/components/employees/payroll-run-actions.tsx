"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startPayrollPayoutAction, retryFailedPayrollPayoutsAction, syncPayrollPayoutStatusesAction } from "@/actions/payroll";
import { Button } from "@/components/ui/button";

interface Props {
  payrollRunId: string;
  status: string;
  failedPayoutCount: number;
  pendingPayoutCount: number;
  processingPayoutCount: number;
}

export function PayrollRunActions({
  payrollRunId,
  status,
  failedPayoutCount,
  pendingPayoutCount,
  processingPayoutCount,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function startPayout() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await startPayrollPayoutAction(payrollRunId);
      setMessage(
        `Payout started: ${result.successCount} succeeded, ${result.failCount} failed.` +
        (result.errors.length > 0 ? ` ${result.errors.join("; ")}` : ""),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setLoading(false);
    }
  }

  async function retryFailed() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await retryFailedPayrollPayoutsAction(payrollRunId);
      setMessage(
        `Retry complete: ${result.successCount} succeeded, ${result.failCount} failed.` +
        (result.errors.length > 0 ? ` ${result.errors.join("; ")}` : ""),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await syncPayrollPayoutStatusesAction(payrollRunId);
      setMessage(
        result.updated > 0
          ? `Updated ${result.updated} payout${result.updated === 1 ? "" : "s"} from Razorpay.`
          : result.synced > 0
            ? "Statuses checked — all payouts still in progress at Razorpay."
            : "No in-progress Razorpay payouts to sync.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status sync failed");
    } finally {
      setLoading(false);
    }
  }

  const canStart = status === "DRAFT" || status === "APPROVED";
  const canRetry = failedPayoutCount > 0 && ["COMPLETED", "FAILED", "PROCESSING"].includes(status);
  const canRefresh = processingPayoutCount > 0;

  if (!canStart && !canRetry && !canRefresh) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {canStart && (
        <Button onClick={startPayout} disabled={loading}>
          Start Payout via RazorpayX
        </Button>
      )}
      {canRefresh && (
        <Button variant="outline" onClick={refreshStatus} disabled={loading}>
          Refresh Status from Razorpay
        </Button>
      )}
      {canRetry && (
        <Button variant="outline" onClick={retryFailed} disabled={loading}>
          Retry {failedPayoutCount} Failed Payout{failedPayoutCount === 1 ? "" : "s"}
        </Button>
      )}
      {pendingPayoutCount > 0 && !canStart && (
        <p className="text-sm text-text-2">
          {pendingPayoutCount} payout{pendingPayoutCount === 1 ? "" : "s"} still pending.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}
    </div>
  );
}
