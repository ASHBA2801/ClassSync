import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { getPayrollRunAction } from "@/actions/payroll";
import { PayrollRunActions } from "@/components/employees/payroll-run-actions";
import { PayrollPayoutStatusPanel } from "@/components/employees/payroll-payout-status-panel";
import { schoolAdminNav } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { summarizePayoutStatuses } from "@/lib/payroll/payout-status";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PayrollRunDetailPage({ params }: Props) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const { id } = await params;
  const run = await getPayrollRunAction(id);
  if (!run) notFound();

  const payoutSummary = summarizePayoutStatuses(run.payouts);

  return (
    <PortalShell title="Payroll Run" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Link href="/admin/employees/payroll" className="text-sm text-text-2 hover:underline">
          ← Back to Payroll
        </Link>
        <Link href="/admin/employees/payouts" className="text-sm text-text-2 hover:underline">
          View all payout history
        </Link>
      </div>

      <PayrollRunActions
        payrollRunId={run.id}
        status={run.status}
        failedPayoutCount={payoutSummary.FAILED}
        pendingPayoutCount={payoutSummary.PENDING}
        processingPayoutCount={payoutSummary.PROCESSING}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {run.periodStart.toISOString().slice(0, 10)} — {run.periodEnd.toISOString().slice(0, 10)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <span>
            Run status:{" "}
            <Badge variant={run.status === "COMPLETED" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>
              {run.status}
            </Badge>
          </span>
          <span>Employees: {run.employeeCount}</span>
          <span>Total: ₹{run.totalAmount.toString()}</span>
          {run.approvedBy && <span>Approved by: {run.approvedBy.name}</span>}
        </CardContent>
      </Card>

      <PayrollPayoutStatusPanel
        payouts={run.payouts.map((payout) => ({
          id: payout.id,
          grossAmount: payout.grossAmount.toString(),
          netAmount: payout.netAmount.toString(),
          status: payout.status,
          failureReason: payout.failureReason,
          razorpayPayoutId: payout.razorpayPayoutId,
          paidAt: payout.paidAt,
          updatedAt: payout.updatedAt,
          employee: payout.employee,
        }))}
        summary={payoutSummary}
      />
    </PortalShell>
  );
}
