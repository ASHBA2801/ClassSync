import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSalaryPayoutsAction } from "@/actions/payroll";
import { schoolAdminNav } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

export default async function PayoutsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const payouts = await listSalaryPayoutsAction();

  return (
    <PortalShell title="Payout History" navItems={schoolAdminNav} userName={ctx.name}>
      <Card>
        <CardHeader><CardTitle>Recent Payouts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Slip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.employee.user.name}</TableCell>
                  <TableCell className="text-text-2">
                    {p.payrollRun.periodStart.toISOString().slice(0, 7)}
                  </TableCell>
                  <TableCell>₹{p.netAmount.toString()}</TableCell>
                  <TableCell><Badge variant={p.status === "SUCCESS" ? "success" : "warning"}>{p.status}</Badge></TableCell>
                  <TableCell>
                    <Link href={`/admin/employees/payouts/${p.id}`} className="text-sm hover:underline">View</Link>
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
