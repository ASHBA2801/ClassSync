import { ParentPortalShell } from "@/components/parent-portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getAllLinkedChildrenAction, getLinkedStudentsAction } from "@/actions/parent";
import { listFeeInvoicesForParentAction } from "@/actions/payments";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parentNav } from "@/lib/nav-config";
import { User, CreditCard, CheckCircle2 } from "lucide-react";
import { SwitchChildButton } from "./switch-child-button";
import { cn } from "@/lib/utils";

export default async function ParentDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "PARENT") redirect("/login");

  const [students, allChildren, invoices] = await Promise.all([
    getLinkedStudentsAction(),
    getAllLinkedChildrenAction(),
    listFeeInvoicesForParentAction(),
  ]);

  const pendingInvoices = invoices.filter((i) => i.status !== "PAID");
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const activeStudentId = ctx.activeStudentId;

  const otherSchoolChildren = allChildren.filter((c) => c.schoolId !== ctx.schoolId);

  return (
    <ParentPortalShell title="Parent Portal" navItems={parentNav} userName={ctx.name}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>My Children</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {students.map((s) => {
                const isActive = s.id === activeStudentId;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "glass-nested flex items-center gap-3 p-4",
                      isActive && "ring-1 ring-primary/40",
                    )}
                  >
                    <div className="icon-ring h-10 w-10 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-1 text-shadow-sm">{s.name}</p>
                      <p className="text-xs text-text-2">{s.classSection?.name ?? "Unassigned"}</p>
                    </div>
                    {isActive && <Badge variant="success">Active</Badge>}
                  </div>
                );
              })}
            </div>

            {otherSchoolChildren.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                  Other schools
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {otherSchoolChildren.map((c) => (
                    <div key={c.studentId} className="glass-nested flex items-center gap-3 p-4">
                      <div className="icon-ring h-10 w-10 shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-1">{c.studentName}</p>
                        <p className="text-xs text-text-2">
                          {c.schoolName}
                          {c.classSectionName ? ` · ${c.classSectionName}` : ""}
                        </p>
                      </div>
                      <SwitchChildButton
                        schoolId={c.schoolId}
                        studentId={c.studentId}
                        label="View"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="icon-ring h-8 w-8">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle>Pending Fees</CardTitle>
            </div>
            {pendingInvoices.length > 0 && (
              <Badge variant="warning">{pendingInvoices.length} pending</Badge>
            )}
          </CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <div className="empty-state">
                <div className="icon-ring h-12 w-12">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="success">All fees paid</Badge>
                <p className="text-sm text-text-2">No outstanding payments at this time.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pendingInvoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-nested flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-1">{inv.student.name}</p>
                      <p className="text-xs text-text-2">Invoice</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">₹{inv.amount}</p>
                  </div>
                ))}
                {totalPending > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-medium text-text-2">Total pending</p>
                    <p className="text-base font-bold text-text-1 text-shadow-sm">
                      ₹{totalPending.toLocaleString()}
                    </p>
                  </div>
                )}
                <Link href="/parent/fees" className="btn-gradient mt-3 inline-flex w-full items-center justify-center rounded-[var(--radius-md)] px-4 py-2.5 text-sm">
                  Pay Now
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ParentPortalShell>
  );
}
