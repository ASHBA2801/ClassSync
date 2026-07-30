import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getLinkedStudentsAction, listParentLeaveRequestsAction } from "@/actions/parent";
import { ParentLeaveForm } from "./parent-leave-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/documents", label: "Documents" },
  { href: "/parent/leave", label: "Leave Requests" },
  { href: "/parent/fees", label: "Fees & Payments" },
];

export default async function ParentLeavePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const [students, requests] = await Promise.all([
    getLinkedStudentsAction(),
    listParentLeaveRequestsAction(),
  ]);

  return (
    <PortalShell title="Leave Requests" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Request Leave for Student</CardTitle></CardHeader>
          <CardContent>
            <ParentLeaveForm students={students.map((s) => ({ id: s.id, name: s.name }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
          <CardContent>
            {requests.map((r) => (
              <div key={r.id} className="border-b py-2 text-sm">
                <p>{r.student?.name}: {r.reason}</p>
                <p className="text-zinc-500">{r.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
