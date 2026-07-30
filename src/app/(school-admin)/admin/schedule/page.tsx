import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  getActiveScheduleAction,
  listScheduleVersionsAction,
  listPeriodTimingsAction,
} from "@/actions/scheduler";
import { ScheduleControls } from "./schedule-controls";
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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function SchedulePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [schedule, versions, periods] = await Promise.all([
    getActiveScheduleAction(),
    listScheduleVersionsAction(),
    listPeriodTimingsAction(),
  ]);

  const slotsByDay = new Map<number, typeof schedule extends null ? never : NonNullable<typeof schedule>["scheduleSlots"]>();
  schedule?.scheduleSlots.forEach((slot) => {
    const existing = slotsByDay.get(slot.dayOfWeek) ?? [];
    existing.push(slot);
    slotsByDay.set(slot.dayOfWeek, existing);
  });

  return (
    <PortalShell title="Schedule" navItems={navItems} userName={ctx.name}>
      <ScheduleControls periods={periods} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            Active Schedule {schedule ? `(v${schedule.version})` : "(none)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!schedule ? (
            <p className="text-sm text-zinc-500">No schedule generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 text-left">Period</th>
                    {DAYS.map((d, i) => (
                      <th key={d} className="p-2 text-left">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.periodNo}>
                      <td className="p-2 font-medium">P{p.periodNo}</td>
                      {DAYS.map((_, day) => {
                        const slot = slotsByDay.get(day)?.find((s) => s.periodNo === p.periodNo);
                        return (
                          <td key={day} className="p-2 text-xs">
                            {slot ? (
                              <div>
                                <p>{slot.subject.name}</p>
                                <p className="text-zinc-500">{slot.classSection.name}</p>
                              </div>
                            ) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Versions</CardTitle></CardHeader>
        <CardContent>
          {versions.map((v) => (
            <div key={v.id} className="border-b py-2 text-sm">
              v{v.version} · {v._count.scheduleSlots} slots · {v.isActive ? "Active" : "Archived"}
            </div>
          ))}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
