"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markPayoutPaidManuallyAction } from "@/actions/payroll";
import { Button } from "@/components/ui/button";
import { PayoutStatusBadge } from "@/components/employees/payout-status-badge";
import { formatDateTime } from "@/lib/payroll/payout-status";

interface Props {
  payout: {
    id: string;
    payrollRunId: string;
    status: string;
    grossAmount: number;
    netAmount: number;
    employeeName: string;
    employeeCode: string;
    periodStart: Date;
    periodEnd: Date;
    deductions: Record<string, number>;
    paidAt: Date | null;
    failureReason: string | null;
    razorpayPayoutId: string | null;
    updatedAt: Date;
  };
}

export function SalarySlipView({ payout }: Props) {
  const router = useRouter();

  async function markPaid() {
    await markPayoutPaidManuallyAction(payout.id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Link href={`/admin/employees/payroll/${payout.payrollRunId}`} className="text-sm text-text-2 hover:underline">
        ← Back to payroll run
      </Link>

      <div className="glass-card max-w-2xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Salary Slip</h2>
          <PayoutStatusBadge status={payout.status} />
        </div>

        <div className="space-y-1 text-sm">
          <p><strong>{payout.employeeName}</strong> ({payout.employeeCode})</p>
          <p className="text-text-2">
            Period: {payout.periodStart.toISOString().slice(0, 10)} — {payout.periodEnd.toISOString().slice(0, 10)}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4 text-sm">
          <h3 className="mb-3 font-medium">Payment Status</h3>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-text-2">Status</dt>
              <dd className="mt-1"><PayoutStatusBadge status={payout.status} /></dd>
            </div>
            <div>
              <dt className="text-text-2">Paid on</dt>
              <dd className="mt-1">{formatDateTime(payout.paidAt)}</dd>
            </div>
            <div>
              <dt className="text-text-2">Last updated</dt>
              <dd className="mt-1">{formatDateTime(payout.updatedAt)}</dd>
            </div>
            <div>
              <dt className="text-text-2">Payment reference</dt>
              <dd className="mt-1 break-all">{payout.razorpayPayoutId ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-text-2">Failure reason</dt>
              <dd className="mt-1">{payout.failureReason ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between"><span>Gross Salary</span><span>₹{payout.grossAmount.toFixed(2)}</span></div>
          {Object.entries(payout.deductions).map(([key, val]) => (
            <div key={key} className="flex justify-between text-text-2">
              <span>{key.replace(/_/g, " ")}</span><span>- ₹{val.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold border-t border-border pt-2">
            <span>Net Pay</span><span>₹{payout.netAmount.toFixed(2)}</span>
          </div>
        </div>

        {payout.status !== "SUCCESS" && (
          <Button variant="outline" size="sm" onClick={markPaid}>Mark as Paid (Manual)</Button>
        )}
      </div>
    </div>
  );
}
