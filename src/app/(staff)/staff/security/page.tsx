import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { SecurityCheckInForm } from "@/components/staff/security-check-in-form";

export default async function StaffSecurityCheckInPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);

  return (
    <PortalShell title="Entry Check-In" navItems={nav} userName={ctx.name}>
      <SecurityCheckInForm />
    </PortalShell>
  );
}
