import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getTeacherScheduleAction } from "@/actions/attendance";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { teacherNav } from "@/lib/nav-config";
import { ClipboardCheck, Calendar, Clock } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function TeacherDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const schedule = await getTeacherScheduleAction();
  const today = new Date().getDay();
  const adjustedDay = today === 0 ? 6 : today - 1;
  const todaySlots = schedule.filter((s) => s.dayOfWeek === adjustedDay);

  return (
    <PortalShell title="Teacher Portal" navItems={teacherNav} userName={ctx.name}>
      <div className="space-y-6">
        {/* Today's Schedule — vertical timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-2" />
                <CardTitle>Today&apos;s Classes</CardTitle>
              </div>
              <Badge variant="outline">{DAYS[adjustedDay]}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todaySlots.length === 0 ? (
              <p className="text-sm text-text-2 py-4 text-center">No classes scheduled today.</p>
            ) : (
              <div className="space-y-3">
                {todaySlots.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 text-xs font-semibold text-primary">
                      P{s.periodNo}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-1">{s.subject.name}</p>
                      <p className="text-xs text-text-2">{s.classSection.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/teacher/attendance" className="group">
            <Card className="transition-colors group-hover:border-primary/30">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-1">Mark Attendance</p>
                  <p className="text-xs text-text-2">Geo + face verification</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/teacher/schedule" className="group">
            <Card className="transition-colors group-hover:border-primary/30">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-1">Full Schedule</p>
                  <p className="text-xs text-text-2">View weekly timetable</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/teacher/leave" className="group">
            <Card className="transition-colors group-hover:border-primary/30">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-1">Request Leave</p>
                  <p className="text-xs text-text-2">Submit leave application</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
