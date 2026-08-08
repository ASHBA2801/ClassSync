import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { getAccountantFeesSummaryAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function StaffFeesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const summary = await getAccountantFeesSummaryAction();

  return (
    <PortalShell title="Fees Report" navItems={nav} userName={ctx.name}>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Outstanding</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">₹{summary.outstanding.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Collected</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">₹{summary.collected.toLocaleString()}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.recentPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.studentName}</TableCell>
                  <TableCell>₹{p.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-text-2">{p.createdAt.toISOString().slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
