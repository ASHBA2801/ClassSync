import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listLeaveRequestsForReviewAction } from "@/actions/parent";
import { LeaveReviewList } from "./leave-review";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/leave", label: "Leave Requests" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function LeavePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const requests = await listLeaveRequestsForReviewAction();

  return (
    <PortalShell title="Leave Requests" navItems={navItems} userName={ctx.name}>
      <LeaveReviewList requests={requests} />
    </PortalShell>
  );
}
