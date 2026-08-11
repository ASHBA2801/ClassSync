import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayoutStatusBadge } from "@/components/employees/payout-status-badge";
import {
  formatDateTime,
  formatPayoutSummary,
  type PayoutStatusSummary,
} from "@/lib/payroll/payout-status";

export interface PayrollPayoutRow {
  id: string;
  grossAmount: string;
  netAmount: string;
  status: string;
  failureReason: string | null;
  razorpayPayoutId: string | null;
  paidAt: Date | null;
  updatedAt: Date;
  employee: {
    user: { name: string; email: string };
  };
}

interface Props {
  payouts: PayrollPayoutRow[];
  summary: PayoutStatusSummary;
}

function SummaryCard({ label, count, tone }: { label: string; count: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-text-2">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? ""}`}>{count}</p>
    </div>
  );
}

export function PayrollPayoutStatusPanel({ payouts, summary }: Props) {
  const hasAttention = summary.FAILED + summary.REVERSED + summary.PROCESSING + summary.PENDING > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Paid" count={summary.SUCCESS} tone="text-success" />
        <SummaryCard label="Processing" count={summary.PROCESSING} tone="text-info" />
        <SummaryCard label="Pending" count={summary.PENDING} />
        <SummaryCard label="Failed" count={summary.FAILED} tone="text-danger" />
        <SummaryCard label="Reversed" count={summary.REVERSED} tone="text-danger" />
      </div>

      {hasAttention && summary.SUCCESS > 0 && (
        <p className="text-sm text-warning">
          Some employees still need attention: {formatPayoutSummary(summary)}.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Employee Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Payment ref</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead>Failure reason</TableHead>
                <TableHead>Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    <div className="font-medium">{payout.employee.user.name}</div>
                    <div className="text-xs text-text-2">{payout.employee.user.email}</div>
                  </TableCell>
                  <TableCell>₹{payout.grossAmount}</TableCell>
                  <TableCell>₹{payout.netAmount}</TableCell>
                  <TableCell>
                    <PayoutStatusBadge status={payout.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-2">
                    {formatDateTime(payout.paidAt)}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-xs text-text-2" title={payout.razorpayPayoutId ?? undefined}>
                    {payout.razorpayPayoutId ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-2">
                    {formatDateTime(payout.updatedAt)}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-text-2">
                    {payout.failureReason ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/employees/payouts/${payout.id}`} className="text-sm hover:underline">
                      View slip
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
