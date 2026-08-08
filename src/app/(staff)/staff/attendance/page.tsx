import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { listStaffAttendanceAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { StaffAttendancePanel } from "@/components/staff/staff-attendance-panel";

export default async function StaffAttendancePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const records = await listStaffAttendanceAction();

  return (
    <PortalShell title="Attendance" navItems={nav} userName={ctx.name}>
      <StaffAttendancePanel records={records} />
    </PortalShell>
  );
}
