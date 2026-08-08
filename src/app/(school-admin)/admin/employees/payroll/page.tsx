import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getPayrollReadinessAction, listPayrollRunsAction } from "@/actions/payroll";
import { PayrollManagement } from "@/components/employees/payroll-management";
import { getRazorpayPayoutWebhookUrl } from "@/lib/payments/razorpay-setup";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function PayrollPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [runs, readiness] = await Promise.all([
    listPayrollRunsAction(),
    getPayrollReadinessAction(),
  ]);

  return (
    <PortalShell title="Payroll" navItems={schoolAdminNav} userName={ctx.name}>
      <PayrollManagement
        runs={runs}
        readiness={readiness}
        payoutWebhookUrl={getRazorpayPayoutWebhookUrl(ctx.schoolId!)}
      />
    </PortalShell>
  );
}
