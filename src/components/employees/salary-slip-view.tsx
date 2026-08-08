"use client";

import { useRouter } from "next/navigation";
import { markPayoutPaidManuallyAction } from "@/actions/payroll";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  payout: {
    id: string;
    status: string;
    grossAmount: number;
    netAmount: number;
    employeeName: string;
    employeeCode: string;
    periodStart: Date;
    periodEnd: Date;
    deductions: Record<string, number>;
    paidAt: Date | null;
  };
}

export function SalarySlipView({ payout }: Props) {
  const router = useRouter();

  async function markPaid() {
    await markPayoutPaidManuallyAction(payout.id);
    router.refresh();
  }

  return (
    <div className="glass-card max-w-lg space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Salary Slip</h2>
        <Badge variant={payout.status === "SUCCESS" ? "success" : "warning"}>{payout.status}</Badge>
      </div>
      <div className="space-y-1 text-sm">
        <p><strong>{payout.employeeName}</strong> ({payout.employeeCode})</p>
        <p className="text-text-2">
          Period: {payout.periodStart.toISOString().slice(0, 10)} — {payout.periodEnd.toISOString().slice(0, 10)}
        </p>
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
      {payout.paidAt && (
        <p className="text-xs text-text-2">Paid on {payout.paidAt.toISOString().slice(0, 10)}</p>
      )}
      {payout.status !== "SUCCESS" && (
        <Button variant="outline" size="sm" onClick={markPaid}>Mark as Paid (Manual)</Button>
      )}
    </div>
  );
}
