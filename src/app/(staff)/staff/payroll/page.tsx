import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { getMySalarySlipsAction } from "@/actions/payroll";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function StaffPayrollPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const slips = await getMySalarySlipsAction();

  return (
    <PortalShell title="My Salary" navItems={nav} userName={ctx.name}>
      {employee.activeSalary && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Current Salary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">₹{employee.activeSalary.baseSalary.toLocaleString()} / month</p>
            {employee.bankAccounts[0] && (
              <p className="mt-2 text-sm text-text-2">
                Bank: {employee.bankAccounts[0].accountNumberMasked} ({employee.bankAccounts[0].isVerified ? "Verified" : "Pending"})
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Salary Slips</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slips.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.periodStart.toISOString().slice(0, 10)} — {s.periodEnd.toISOString().slice(0, 10)}</TableCell>
                  <TableCell>₹{s.netAmount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={s.status === "SUCCESS" ? "success" : "warning"}>{s.status}</Badge></TableCell>
                  <TableCell>
                    <Link href={`/staff/payroll/${s.id}`} className="text-sm hover:underline">View slip</Link>
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
