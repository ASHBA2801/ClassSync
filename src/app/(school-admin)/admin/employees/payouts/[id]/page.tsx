import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { getSalarySlipAction } from "@/actions/payroll";
import { SalarySlipView } from "@/components/employees/salary-slip-view";
import { schoolAdminNav } from "@/lib/nav-config";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PayoutSlipPage({ params }: Props) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const { id } = await params;
  const slip = await getSalarySlipAction(id);
  if (!slip) notFound();

  return (
    <PortalShell title="Salary Slip" navItems={schoolAdminNav} userName={ctx.name}>
      <SalarySlipView payout={slip} />
    </PortalShell>
  );
}
