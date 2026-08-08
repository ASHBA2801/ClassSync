import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { listCleanerTasksAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { CleanerTasksPanel } from "@/components/staff/cleaner-tasks-panel";

export default async function StaffCleaningPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const tasks = await listCleanerTasksAction();

  return (
    <PortalShell title="Cleaning Tasks" navItems={nav} userName={ctx.name}>
      <CleanerTasksPanel tasks={tasks} />
    </PortalShell>
  );
}
