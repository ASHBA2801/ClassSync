import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSalaryPayoutsAction } from "@/actions/payroll";
import { schoolAdminNav } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PayoutStatusBadge } from "@/components/employees/payout-status-badge";
import { formatDateTime } from "@/lib/payroll/payout-status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function PayoutsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const payouts = await listSalaryPayoutsAction();

  return (
    <PortalShell title="Payout History" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="mb-4">
        <Link href="/admin/employees/payroll" className="text-sm text-text-2 hover:underline">
          ← Back to Payroll
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Employee Payment History</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead>Failure reason</TableHead>
                <TableHead>Payroll run</TableHead>
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
                  <TableCell className="text-text-2">
                    {payout.payrollRun.periodStart.toISOString().slice(0, 7)}
                  </TableCell>
                  <TableCell>₹{payout.netAmount.toString()}</TableCell>
                  <TableCell><PayoutStatusBadge status={payout.status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-2">
                    {formatDateTime(payout.paidAt)}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-text-2">
                    {payout.failureReason ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/employees/payroll/${payout.payrollRun.id}`}
                      className="text-sm hover:underline"
                    >
                      View run
                    </Link>
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
    </PortalShell>
  );
}
