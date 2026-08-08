import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { listVisitorLogsAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { SecurityVisitorPanel } from "@/components/staff/security-visitor-panel";

export default async function StaffSecurityPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const logs = await listVisitorLogsAction();

  return (
    <PortalShell title="Visitor Log" navItems={nav} userName={ctx.name}>
      <SecurityVisitorPanel logs={logs} />
    </PortalShell>
  );
}
