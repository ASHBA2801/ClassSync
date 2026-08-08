import { PortalShell } from "@/components/portal-shell";
import { getEmployeeForCurrentUserAction } from "@/actions/employees";
import { listSportsSchedulesAction } from "@/actions/staff-modules";
import { getStaffNavForJobType } from "@/lib/employees/capabilities";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StaffSportsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "STAFF") redirect("/login");

  const employee = await getEmployeeForCurrentUserAction();
  if (!employee) redirect("/login");

  const nav = getStaffNavForJobType(employee.jobType);
  const events = await listSportsSchedulesAction();

  return (
    <PortalShell title="Sports Schedule" navItems={nav} userName={ctx.name}>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader><CardTitle>{event.title}</CardTitle></CardHeader>
            <CardContent className="text-sm text-text-2 space-y-1">
              <p>Date: {event.eventDate.toISOString().slice(0, 10)}</p>
              {event.location && <p>Location: {event.location}</p>}
              {event.notes && <p>{event.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
