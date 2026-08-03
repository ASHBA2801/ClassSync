import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listTeacherLeaveRequestsAction } from "@/actions/attendance";
import { LeaveRequestForm } from "./leave-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teacherNav } from "@/lib/nav-config";

export default async function TeacherLeavePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const requests = await listTeacherLeaveRequestsAction();

  return (
    <PortalShell title="Leave Requests" navItems={teacherNav} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Submit Leave</CardTitle></CardHeader>
          <CardContent><LeaveRequestForm /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.reason}</TableCell>
                    <TableCell className="text-text-2">{r.startDate.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "APPROVED" ? "success" :
                          r.status === "REJECTED" ? "danger" :
                          "warning"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
