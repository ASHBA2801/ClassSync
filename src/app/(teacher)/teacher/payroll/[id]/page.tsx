import { PortalShell } from "@/components/portal-shell";
import { getSalarySlipAction } from "@/actions/payroll";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { teacherNav } from "@/lib/nav-config";
import { SalarySlipView } from "@/components/employees/salary-slip-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TeacherPayrollSlipPage({ params }: Props) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const slip = await getSalarySlipAction(id);
  if (!slip) notFound();

  return (
    <PortalShell title="Salary Slip" navItems={teacherNav} userName={ctx.name}>
      <SalarySlipView payout={slip} />
    </PortalShell>
  );
}
