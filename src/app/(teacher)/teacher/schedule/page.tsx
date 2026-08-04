import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getTeacherScheduleAction, getTeacherUpcomingAlterationsAction } from "@/actions/attendance";
import { ScheduleExport } from "./schedule-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { teacherNav } from "@/lib/nav-config";
import Link from "next/link";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function TeacherSchedulePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const [schedule, alterations] = await Promise.all([
    getTeacherScheduleAction(),
    getTeacherUpcomingAlterationsAction(),
  ]);

  return (
    <PortalShell title="My Schedule" navItems={teacherNav} userName={ctx.name}>
      <div className="flex flex-wrap gap-2">
        <ScheduleExport schedule={schedule} />
        <Button variant="outline" size="sm" asChild>
          <Link href="/teacher/schedule/swaps">Schedule Swaps</Link>
        </Button>
      </div>

      {alterations.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Upcoming Changes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alterations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{new Date(a.date).toISOString().slice(0, 10)}</TableCell>
                    <TableCell>P{a.periodNo}</TableCell>
                    <TableCell>{a.classSection.name} — {a.subject.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" hideIcon>{a.type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.substituteTeacherId === ctx.userId ? (
                        <Badge variant="warning" hideIcon>Covering</Badge>
                      ) : (
                        <Badge variant="outline" hideIcon>Covered</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {DAYS.map((day, dayIndex) => {
          const daySlots = schedule.filter((s) => s.dayOfWeek === dayIndex);
          if (daySlots.length === 0) return null;
          return (
            <Card key={day}>
              <CardHeader><CardTitle>{day}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Period</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daySlots.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">Period {s.periodNo}</TableCell>
                        <TableCell>{s.subject.name}</TableCell>
                        <TableCell className="text-text-2">{s.classSection.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PortalShell>
  );
}
