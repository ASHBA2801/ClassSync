import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getTeacherScheduleAction } from "@/actions/attendance";
import { ScheduleExport } from "./schedule-export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teacherNav } from "@/lib/nav-config";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function TeacherSchedulePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const schedule = await getTeacherScheduleAction();

  return (
    <PortalShell title="My Schedule" navItems={teacherNav} userName={ctx.name}>
      <ScheduleExport schedule={schedule} />

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
