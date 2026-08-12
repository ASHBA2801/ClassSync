import { PortalShell } from "@/components/portal-shell";
import { listAdminVisitorLogsAction } from "@/actions/staff-modules";
import { getSessionContext } from "@/lib/rbac/guard";
import { schoolAdminNav } from "@/lib/nav-config";
import { redirect } from "next/navigation";
import { VisitorLogsTable } from "@/components/staff/visitor-logs-table";

export default async function AdminVisitorLogsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const logs = await listAdminVisitorLogsAction();

  return (
    <PortalShell title="Entry Logs" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="space-y-3">
        <p className="text-sm text-text-2">
          School entry records logged by security (name, mobile, reason, and photo).
        </p>
        <div className="glass-card p-4">
          <VisitorLogsTable logs={logs} />
        </div>
      </div>
    </PortalShell>
  );
}
