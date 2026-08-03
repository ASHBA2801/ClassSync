import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolsAction } from "@/actions/system-admin";
import { getPlatformMonitoringAction, getSchoolBillingOverviewAction } from "@/actions/monitoring";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { systemAdminNav } from "@/lib/nav-config";
import { School, Activity, AlertTriangle, CreditCard } from "lucide-react";

export default async function SystemDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const [schools, monitoring, billing] = await Promise.all([
    listSchoolsAction(),
    getPlatformMonitoringAction(),
    getSchoolBillingOverviewAction(),
  ]);

  return (
    <PortalShell title="System Admin" navItems={systemAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Schools</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{monitoring.schoolCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <School className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Active</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{monitoring.activeSchools}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-success-light">
                  <Activity className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Escalations</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{monitoring.escalatedAttendance}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-warning-light">
                  <AlertTriangle className="h-5 w-5 text-warning" />
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

        {/* Recent Schools Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Schools</CardTitle>
            <Link href="/system/schools" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.slice(0, 5).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-2">{s.planTier}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Billing Overview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.slice(0, 5).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s._count.students}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.planTier}</Badge>
                    </TableCell>
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
