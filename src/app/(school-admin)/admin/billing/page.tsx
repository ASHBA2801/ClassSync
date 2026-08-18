import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getSchoolBillingSnapshotAction } from "@/actions/billing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { schoolAdminNav } from "@/lib/nav-config";
import { PlanCheckout } from "./plan-checkout";

function formatInr(value: string) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default async function SchoolBillingPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const snapshot = await getSchoolBillingSnapshotAction();

  return (
    <PortalShell title="Core Module Billing" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-2">Current plan</p>
              <p className="text-xl font-semibold text-text-1 mt-1">
                {snapshot.subscription?.planName ?? "None"}
              </p>
              {snapshot.subscription ? (
                <Badge
                  className="mt-2"
                  variant={snapshot.subscription.status === "ACTIVE" ? "success" : "warning"}
                >
                  {snapshot.subscription.status}
                </Badge>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-2">Login users</p>
              <p className="text-xl font-semibold text-text-1 mt-1">
                {snapshot.billableUsers}
                {snapshot.subscription ? ` / ${snapshot.subscription.userLimit}` : ""}
              </p>
              {snapshot.subscription?.overLimit ? (
                <p className="text-xs text-warning mt-2">Over the subscribed user limit.</p>
              ) : (
                <p className="text-xs text-text-2 mt-2">Admins, teachers, staff, and parents.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-text-2">Renews</p>
              <p className="text-xl font-semibold text-text-1 mt-1">
                {snapshot.subscription
                  ? new Date(snapshot.subscription.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose a core module plan</CardTitle>
            <CardDescription>
              Pay with the same gateways configured in Settings. The plan covers ClassSync login users for one year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanCheckout
              plans={snapshot.plans}
              providers={snapshot.providers}
              currentPlanId={
                snapshot.subscription?.status === "ACTIVE" ? snapshot.subscription.planId : null
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent plan invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.invoices.length === 0 ? (
              <p className="text-sm text-text-2">No core module invoices yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.planName}</TableCell>
                      <TableCell>{formatInr(inv.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.status === "PAID" ? "success" : inv.status === "FAILED" ? "danger" : "warning"
                          }
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-2">
                        {new Date(inv.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
