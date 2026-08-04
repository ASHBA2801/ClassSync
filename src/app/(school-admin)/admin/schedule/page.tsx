import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  getActiveScheduleAction,
  getScheduleSetupStatusAction,
  listScheduleVersionsAction,
  listPeriodTimingsAction,
} from "@/actions/scheduler";
import { listSchoolTeachersAction } from "@/actions/smart-scheduler";
import { ScheduleControls } from "./schedule-controls";
import { ScheduleDayView } from "./schedule-day-view";
import { ScheduleEditPanel } from "./schedule-edit-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function SchedulePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [schedule, versions, periods, readiness, teachers] = await Promise.all([
    getActiveScheduleAction(),
    listScheduleVersionsAction(),
    listPeriodTimingsAction(),
    getScheduleSetupStatusAction(),
    listSchoolTeachersAction(),
  ]);

  const slotsByDay = new Map<number, typeof schedule extends null ? never : NonNullable<typeof schedule>["scheduleSlots"]>();
  schedule?.scheduleSlots.forEach((slot) => {
    const existing = slotsByDay.get(slot.dayOfWeek) ?? [];
    existing.push(slot);
    slotsByDay.set(slot.dayOfWeek, existing);
  });

  return (
    <PortalShell title="Schedule" navItems={schoolAdminNav} userName={ctx.name}>
      <ScheduleControls periods={periods} readiness={readiness} />
      <ScheduleDayView periods={periods} />

      {schedule && (
        <ScheduleEditPanel slots={schedule.scheduleSlots} teachers={teachers} />
      )}

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>
              Active Schedule
            </CardTitle>
            {schedule ? (
              <Badge variant="success">v{schedule.version}</Badge>
            ) : (
              <Badge variant="outline">none</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!schedule ? (
            <p className="text-sm text-text-2 py-4 text-center">No schedule generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Period</TableHead>
                    {DAYS.map((d) => (
                      <TableHead key={d}>{d}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.periodNo}>
                      <TableCell className="font-medium">P{p.periodNo}</TableCell>
                      {DAYS.map((_, day) => {
                        const slot = slotsByDay.get(day)?.find((s) => s.periodNo === p.periodNo);
                        return (
                          <TableCell key={day} className="text-xs">
                            {slot ? (
                              <div>
                                <p className="font-medium text-text-1">{slot.subject.name}</p>
                                <p className="text-text-2">{slot.classSection.name}</p>
                              </div>
                            ) : (
                              <span className="text-text-2">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Versions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">v{v.version}</TableCell>
                  <TableCell>{v._count.scheduleSlots} slots</TableCell>
                  <TableCell>
                    <Badge variant={v.isActive ? "success" : "outline"}>
                      {v.isActive ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
