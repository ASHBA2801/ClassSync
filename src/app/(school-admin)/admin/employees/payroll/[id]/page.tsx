import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { getPayrollRunAction } from "@/actions/payroll";
import { PayrollRunActions } from "@/components/employees/payroll-run-actions";
import { schoolAdminNav } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  return (
    <PortalShell title="Payroll Run" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="mb-4">
        <Link href="/admin/employees/payroll" className="text-sm text-text-2 hover:underline">← Back to Payroll</Link>
      </div>

      <PayrollRunActions payrollRunId={run.id} status={run.status} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {run.periodStart.toISOString().slice(0, 10)} — {run.periodEnd.toISOString().slice(0, 10)}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <span>Status: <Badge>{run.status}</Badge></span>
          <span>Employees: {run.employeeCount}</span>
          <span>Total: ₹{run.totalAmount.toString()}</span>
          {run.approvedBy && <span>Approved by: {run.approvedBy.name}</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Salary Slips</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failure</TableHead>
                <TableHead>Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.employee.user.name}</TableCell>
                  <TableCell>₹{p.grossAmount.toString()}</TableCell>
                  <TableCell>₹{p.netAmount.toString()}</TableCell>
                  <TableCell><Badge variant={p.status === "SUCCESS" ? "success" : "warning"}>{p.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-text-2">{p.failureReason ?? "—"}</TableCell>
                  <TableCell>
                    <Link href={`/admin/employees/payouts/${p.id}`} className="text-sm hover:underline">View slip</Link>
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
