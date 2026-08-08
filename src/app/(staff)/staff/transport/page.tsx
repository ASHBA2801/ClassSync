import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { listTransportRoutesAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StaffTransportPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const routes = await listTransportRoutesAction();

  return (
    <PortalShell title="Transport Routes" navItems={nav} userName={ctx.name}>
      <div className="grid gap-4 md:grid-cols-2">
        {routes.map((route) => (
          <Card key={route.id}>
            <CardHeader><CardTitle>{route.name}</CardTitle></CardHeader>
            <CardContent className="text-sm text-text-2 space-y-1">
              {route.description && <p>{route.description}</p>}
              {route.vehicleNo && <p>Vehicle: {route.vehicleNo}</p>}
              <p>Drivers: {route.assignments.map((a) => a.employee.user.name).join(", ") || "None assigned"}</p>
            </CardContent>
          </Card>
        ))}
        {routes.length === 0 && <p className="text-sm text-text-2">No routes assigned.</p>}
      </div>
    </PortalShell>
  );
}
