import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listLeaveRequestsForReviewAction } from "@/actions/parent";
import { LeaveReviewList } from "./leave-review";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function LeavePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const requests = await listLeaveRequestsForReviewAction();

  return (
    <PortalShell title="Leave Requests" navItems={schoolAdminNav} userName={ctx.name}>
      <LeaveReviewList requests={requests} />
    </PortalShell>
  );
}
