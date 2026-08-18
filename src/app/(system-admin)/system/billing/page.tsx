import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  listCorePricingPlansAction,
  listSchoolSubscriptionsOverviewAction,
} from "@/actions/billing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { systemAdminNav } from "@/lib/nav-config";
import { CorePlanForm } from "./plan-form";
import { AssignPlanForm } from "./assign-plan-form";
import { PlanVisibilityToggle } from "./plan-visibility-toggle";

function formatInr(value: string) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export default async function SystemBillingPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const [plans, schools] = await Promise.all([
    listCorePricingPlansAction(true),
    listSchoolSubscriptionsOverviewAction(),
  ]);

  return (
    <PortalShell title="Core Module Pricing" navItems={systemAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pricing catalog</CardTitle>
            <CardDescription>
              Schools buy the core ClassSync module by login-user capacity. Students do not count toward the limit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Yearly price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description ? (
                        <p className="text-xs text-text-2 mt-1">{plan.description}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{plan.maxUsers}</TableCell>
                    <TableCell>{formatInr(plan.priceAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "success" : "outline"}>
                        {plan.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PlanVisibilityToggle planId={plan.id} isActive={plan.isActive} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add or update a plan</CardTitle>
              <CardDescription>Add a new user-capacity plan and yearly price.</CardDescription>
            </CardHeader>
            <CardContent>
              <CorePlanForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assign a plan</CardTitle>
              <CardDescription>
                Grants a school the selected user limit for one year without collecting payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssignPlanForm
                schools={schools.map((s) => ({ schoolId: s.schoolId, schoolName: s.schoolName }))}
                plans={plans.filter((p) => p.isActive)}
              />
            </CardContent>
          </Card>
        </div>

        {plans.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <Card key={`edit-${plan.id}`}>
                <CardHeader>
                  <CardTitle>Edit {plan.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CorePlanForm plan={plan} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>School usage</CardTitle>
            <CardDescription>Login users vs the subscribed core-module limit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Renews</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.schoolId}>
                    <TableCell className="font-medium">{school.schoolName}</TableCell>
                    <TableCell>
                      <Badge variant={school.status === "ACTIVE" ? "success" : "outline"}>
                        {school.planName ?? "No plan"}
                      </Badge>
                    </TableCell>
                    <TableCell>{school.billableUsers}</TableCell>
                    <TableCell>{school.userLimit ?? "—"}</TableCell>
                    <TableCell className="text-text-2">
                      {school.periodEnd ? new Date(school.periodEnd).toLocaleDateString() : "—"}
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
