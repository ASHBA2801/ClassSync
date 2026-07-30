import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listFeeInvoicesForParentAction } from "@/actions/payments";
import { PaymentList } from "./payment-list";

const navItems = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/documents", label: "Documents" },
  { href: "/parent/leave", label: "Leave Requests" },
  { href: "/parent/fees", label: "Fees & Payments" },
];

export default async function ParentFeesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const invoices = await listFeeInvoicesForParentAction();

  return (
    <PortalShell title="Fees & Payments" navItems={navItems} userName={ctx.name}>
      <PaymentList invoices={invoices} />
    </PortalShell>
  );
}
