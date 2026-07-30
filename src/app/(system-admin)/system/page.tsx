import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolsAction } from "@/actions/system-admin";
import { getPlatformMonitoringAction, getSchoolBillingOverviewAction } from "@/actions/monitoring";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/system", label: "Dashboard" },
  { href: "/system/schools", label: "Schools" },
  { href: "/system/users", label: "Global Users" },
  { href: "/system/ai-keys", label: "AI Keys" },
  { href: "/system/monitoring", label: "Monitoring" },
];

export default async function SystemDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const [schools, monitoring, billing] = await Promise.all([
    listSchoolsAction(),
    getPlatformMonitoringAction(),
    getSchoolBillingOverviewAction(),
  ]);

  return (
    <PortalShell title="System Admin" navItems={navItems} userName={ctx.name}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-base">Schools</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{monitoring.schoolCount}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Active</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{monitoring.activeSchools}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Escalations</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{monitoring.escalatedAttendance}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Failed Payments</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{monitoring.failedPayments}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Schools</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schools.slice(0, 5).map((s) => (
                <div key={s.id} className="flex justify-between border-b py-2 text-sm">
                  <span>{s.name}</span>
                  <span className="text-zinc-500">{s.status} · {s.planTier}</span>
                </div>
              ))}
            </div>
            <Link href="/system/schools" className="mt-4 inline-block text-sm text-blue-600 hover:underline">View all schools</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Billing Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {billing.slice(0, 5).map((s) => (
                <div key={s.id} className="flex justify-between border-b py-2 text-sm">
                  <span>{s.name}</span>
                  <span className="text-zinc-500">{s._count.students} students · {s.planTier}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
