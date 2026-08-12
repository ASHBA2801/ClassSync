import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { listVisitorLogsAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { VisitorLogsTable } from "@/components/staff/visitor-logs-table";

export default async function StaffSecurityLogsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const logs = await listVisitorLogsAction();

  return (
    <PortalShell title="Entry Logs" navItems={nav} userName={ctx.name}>
      <div className="space-y-3">
        <p className="text-sm text-text-2">
          Visitors and guests who checked in at the school gate.
        </p>
        <div className="glass-card p-4">
          <VisitorLogsTable logs={logs} canCheckout />
        </div>
      </div>
    </PortalShell>
  );
}
