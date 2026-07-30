import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listFeeStructuresAction, listSchoolPaymentsAction } from "@/actions/payments";
import { FeeManagement } from "./fee-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/leave", label: "Leave Requests" },
  { href: "/admin/fees", label: "Fees" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function FeesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [structures, payments] = await Promise.all([
    listFeeStructuresAction(),
    listSchoolPaymentsAction(),
  ]);

  return (
    <PortalShell title="Fee Management" navItems={navItems} userName={ctx.name}>
      <FeeManagement structures={structures} />

      <Card className="mt-6">
        <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
        <CardContent>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 text-sm">
              <span>{p.feeInvoice.student.name}</span>
              <span>₹{p.amount.toString()} · {p.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
