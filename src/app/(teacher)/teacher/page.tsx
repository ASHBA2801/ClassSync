import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getTeacherScheduleAction } from "@/actions/attendance";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/schedule", label: "Schedule" },
  { href: "/teacher/attendance", label: "Mark Attendance" },
  { href: "/teacher/leave", label: "Leave Requests" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function TeacherDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const schedule = await getTeacherScheduleAction();
  const today = new Date().getDay();
  const adjustedDay = today === 0 ? 6 : today - 1;
  const todaySlots = schedule.filter((s) => s.dayOfWeek === adjustedDay);

  return (
    <PortalShell title="Teacher Portal" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Today&apos;s Classes</CardTitle></CardHeader>
          <CardContent>
            {todaySlots.length === 0 ? (
              <p className="text-sm text-zinc-500">No classes scheduled today.</p>
            ) : (
              todaySlots.map((s) => (
                <div key={s.id} className="border-b py-2 text-sm">
                  <p className="font-medium">Period {s.periodNo}: {s.subject.name}</p>
                  <p className="text-zinc-500">{s.classSection.name}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/teacher/attendance" className="block text-sm text-blue-600 hover:underline">
              Mark attendance (geo + face)
            </Link>
            <Link href="/teacher/schedule" className="block text-sm text-blue-600 hover:underline">
              View full schedule
            </Link>
            <Link href="/teacher/leave" className="block text-sm text-blue-600 hover:underline">
              Request leave
            </Link>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
