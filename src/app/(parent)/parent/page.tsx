import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getLinkedStudentsAction } from "@/actions/parent";
import { listFeeInvoicesForParentAction } from "@/actions/payments";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/parent", label: "Dashboard" },
  { href: "/parent/documents", label: "Documents" },
  { href: "/parent/leave", label: "Leave Requests" },
  { href: "/parent/fees", label: "Fees & Payments" },
];

export default async function ParentDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const [students, invoices] = await Promise.all([
    getLinkedStudentsAction(),
    listFeeInvoicesForParentAction(),
  ]);

  const pendingInvoices = invoices.filter((i) => i.status !== "PAID");

  return (
    <PortalShell title="Parent Portal" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>My Children</CardTitle></CardHeader>
          <CardContent>
            {students.map((s) => (
              <div key={s.id} className="border-b py-2 text-sm">
                <p className="font-medium">{s.name}</p>
                <p className="text-zinc-500">{s.classSection?.name ?? "Unassigned"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pending Fees ({pendingInvoices.length})</CardTitle></CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <p className="text-sm text-zinc-500">No pending invoices</p>
            ) : (
              <>
                {pendingInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="border-b py-2 text-sm">
                    <p>{inv.student.name}: ₹{inv.amount.toString()}</p>
                  </div>
                ))}
                <Link href="/parent/fees" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
                  View all invoices
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
