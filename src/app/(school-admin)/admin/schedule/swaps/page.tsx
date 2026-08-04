import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolTeachersAction, listSwapGroupsAction } from "@/actions/smart-scheduler";
import { SwapManager } from "./swap-manager";
import { schoolAdminNav } from "@/lib/nav-config";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminSwapsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [teachers, swapGroups] = await Promise.all([
    listSchoolTeachersAction(),
    listSwapGroupsAction(),
  ]);

  return (
    <PortalShell title="Schedule Swaps" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/schedule">← Back to Schedule</Link>
        </Button>
      </div>
      <SwapManager teachers={teachers} swapGroups={swapGroups} />
    </PortalShell>
  );
}
