import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listAlterationsAction } from "@/actions/smart-scheduler";
import { AlterationsList } from "./alterations-list";
import { schoolAdminNav } from "@/lib/nav-config";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AlterationsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const alterations = await listAlterationsAction({ status: "ACTIVE" });

  return (
    <PortalShell title="Schedule Alterations" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/schedule">← Back to Schedule</Link>
        </Button>
      </div>
      <AlterationsList alterations={alterations} />
    </PortalShell>
  );
}
