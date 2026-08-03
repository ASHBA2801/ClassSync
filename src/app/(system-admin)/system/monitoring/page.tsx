import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getPlatformMonitoringAction, listAuditLogsAction } from "@/actions/monitoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { systemAdminNav } from "@/lib/nav-config";
import { AlertTriangle, Bell, CreditCard } from "lucide-react";

export default async function MonitoringPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const [monitoring, auditLogs] = await Promise.all([
    getPlatformMonitoringAction(),
    listAuditLogsAction(50),
  ]);

  return (
    <PortalShell title="Platform Monitoring" navItems={systemAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Failed Notifications</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{monitoring.failedNotifications}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-warning-light">
                  <Bell className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Escalated Attendance</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{monitoring.escalatedAttendance}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-danger-light">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Failed Payments</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{monitoring.failedPayments}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-danger-light">
                  <CreditCard className="h-5 w-5 text-danger" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Health */}
        <Card>
          <CardHeader><CardTitle>Queue Health</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(monitoring.queueHealth).map(([name, count]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>
                      {count >= 0 ? (
                        <Badge variant={count === 0 ? "success" : "warning"}>{count} pending</Badge>
                      ) : (
                        <Badge variant="danger">Unavailable</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader><CardTitle>Recent Audit Logs</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="outline" hideIcon>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.actor.name}</TableCell>
                    <TableCell className="text-text-2 text-xs">{log.createdAt.toISOString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
