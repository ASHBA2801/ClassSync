import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { JOB_TYPE_LABELS } from "@/lib/employees/job-types";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StaffDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);

  return (
    <PortalShell title="Staff Dashboard" navItems={nav} userName={ctx.name}>
      <Card>
        <CardHeader><CardTitle>Welcome, {employee.user.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Role: <strong>{JOB_TYPE_LABELS[employee.jobType]}</strong></p>
          <p>Employee Code: {employee.employeeCode}</p>
          <p className="text-text-2">Use the sidebar to access your role-specific tools.</p>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
