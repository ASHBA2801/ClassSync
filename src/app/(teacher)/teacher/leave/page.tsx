import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listTeacherLeaveRequestsAction } from "@/actions/attendance";
import { LeaveRequestForm } from "./leave-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/schedule", label: "Schedule" },
  { href: "/teacher/attendance", label: "Mark Attendance" },
  { href: "/teacher/leave", label: "Leave Requests" },
];

export default async function TeacherLeavePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const requests = await listTeacherLeaveRequestsAction();

  return (
    <PortalShell title="Leave Requests" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Submit Leave</CardTitle></CardHeader>
          <CardContent><LeaveRequestForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
          <CardContent>
            {requests.map((r) => (
              <div key={r.id} className="border-b py-2 text-sm">
                <p>{r.reason}</p>
                <p className="text-zinc-500">{r.status} · {r.startDate.toISOString().slice(0, 10)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
