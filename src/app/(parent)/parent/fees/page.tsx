import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  listEnabledPaymentProvidersAction,
  listFeeInvoicesForParentAction,
} from "@/actions/payments";
import { PaymentList } from "./payment-list";
import { PaymentBanner } from "./payment-banner";
import { parentNav } from "@/lib/nav-config";

export default async function ParentFeesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const [invoices, providers] = await Promise.all([
    listFeeInvoicesForParentAction(),
    listEnabledPaymentProvidersAction(),
  ]);

  return (
    <PortalShell title="Fees & Payments" navItems={parentNav} userName={ctx.name}>
      <PaymentBanner />
      <PaymentList invoices={invoices} providers={providers} />
    </PortalShell>
  );
}
