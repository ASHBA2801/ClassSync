import { ParentPortalShell } from "@/components/parent-portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getLinkedStudentsAction, listParentLeaveRequestsAction } from "@/actions/parent";
import { ParentLeaveForm } from "./parent-leave-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { parentNav } from "@/lib/nav-config";

export default async function ParentLeavePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const [students, requests] = await Promise.all([
    getLinkedStudentsAction(),
    listParentLeaveRequestsAction(),
  ]);

  return (
    <ParentPortalShell title="Leave Requests" navItems={parentNav} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Request Leave for Student</CardTitle></CardHeader>
          <CardContent>
            <ParentLeaveForm
              students={students.map((s) => ({ id: s.id, name: s.name }))}
              defaultStudentId={ctx.activeStudentId ?? undefined}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.student?.name}</TableCell>
                    <TableCell className="text-text-2">{r.reason}</TableCell>
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
    </ParentPortalShell>
  );
}
