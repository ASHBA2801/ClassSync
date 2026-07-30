import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getPlatformMonitoringAction, listAuditLogsAction } from "@/actions/monitoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/system", label: "Dashboard" },
  { href: "/system/schools", label: "Schools" },
  { href: "/system/users", label: "Global Users" },
  { href: "/system/ai-keys", label: "AI Keys" },
  { href: "/system/monitoring", label: "Monitoring" },
];

export default async function MonitoringPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const [monitoring, auditLogs] = await Promise.all([
    getPlatformMonitoringAction(),
    listAuditLogsAction(50),
  ]);

  return (
    <PortalShell title="Platform Monitoring" navItems={navItems} userName={ctx.name}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-base">Failed Notifications</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{monitoring.failedNotifications}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Escalated Attendance</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{monitoring.escalatedAttendance}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Failed Payments</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{monitoring.failedPayments}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Queue Health</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(monitoring.queueHealth).map(([name, count]) => (
              <div key={name} className="flex justify-between border-b py-2 text-sm">
                <span>{name}</span>
                <span>{count >= 0 ? count : "unavailable"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Audit Logs</CardTitle></CardHeader>
          <CardContent>
            {auditLogs.map((log) => (
              <div key={log.id} className="border-b py-2 text-sm">
                <p><span className="font-medium">{log.action}</span> by {log.actor.name}</p>
                <p className="text-zinc-500">{log.createdAt.toISOString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
