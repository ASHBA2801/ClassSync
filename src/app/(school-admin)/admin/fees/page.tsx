import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listFeeStructuresAction, listSchoolPaymentsAction } from "@/actions/payments";
import { listGradesAction } from "@/actions/school-admin";
import { FeeManagement } from "./fee-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function FeesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [structures, payments, grades] = await Promise.all([
    listFeeStructuresAction(),
    listSchoolPaymentsAction(),
    listGradesAction(),
  ]);

  return (
    <PortalShell title="Fee Management" navItems={schoolAdminNav} userName={ctx.name}>
      <FeeManagement structures={structures} grades={grades} />

      <Card className="mt-6">
        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.feeInvoice.student.name}</TableCell>
                  <TableCell>₹{p.amount.toString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "SUCCESS" ? "success" :
                        p.status === "FAILED" ? "danger" :
                        "warning"
                      }
                    >
                      {p.status}
                    </Badge>
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
