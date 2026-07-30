import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getTeacherScheduleAction } from "@/actions/attendance";
import { ScheduleExport } from "./schedule-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/schedule", label: "Schedule" },
  { href: "/teacher/attendance", label: "Mark Attendance" },
  { href: "/teacher/leave", label: "Leave Requests" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function TeacherSchedulePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const schedule = await getTeacherScheduleAction();

  return (
    <PortalShell title="My Schedule" navItems={navItems} userName={ctx.name}>
      <ScheduleExport schedule={schedule} />

      <div className="mt-6 space-y-4">
        {DAYS.map((day, dayIndex) => {
          const daySlots = schedule.filter((s) => s.dayOfWeek === dayIndex);
          if (daySlots.length === 0) return null;
          return (
            <Card key={day}>
              <CardHeader><CardTitle className="text-base">{day}</CardTitle></CardHeader>
              <CardContent>
                {daySlots.map((s) => (
                  <div key={s.id} className="flex justify-between border-b py-2 text-sm">
                    <span>Period {s.periodNo}</span>
                    <span>{s.subject.name} · {s.classSection.name}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PortalShell>
  );
}
