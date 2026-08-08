import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { getSalarySlipAction } from "@/actions/payroll";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { SalarySlipView } from "@/components/employees/salary-slip-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StaffPayrollSlipPage({ params }: Props) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const { id } = await params;
  const slip = await getSalarySlipAction(id);
  if (!slip) notFound();

  const nav = getStaffNavForJobType(employee.jobType);

  return (
    <PortalShell title="Salary Slip" navItems={nav} userName={ctx.name}>
      <SalarySlipView payout={slip} />
    </PortalShell>
  );
}
