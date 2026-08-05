import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  getActiveScheduleAction,
  getSchoolScheduleConfigAction,
  getScheduleSetupStatusAction,
  listScheduleVersionsAction,
  listPeriodTimingsAction,
} from "@/actions/scheduler";
import { listClassSectionsAction } from "@/actions/school-admin";
import { listSchoolTeachersAction } from "@/actions/smart-scheduler";
import { ScheduleControls } from "./schedule-controls";
import { ScheduleDayView } from "./schedule-day-view";
import { ScheduleEditPanel } from "./schedule-edit-panel";
import { ScheduleSectionView } from "./schedule-section-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const params = await searchParams;

  const [schedule, versions, periods, readiness, teachers, sections, scheduleConfig] =
    await Promise.all([
      getActiveScheduleAction(),
      listScheduleVersionsAction(),
      listPeriodTimingsAction(),
      getScheduleSetupStatusAction(),
      listSchoolTeachersAction(),
      listClassSectionsAction(),
      getSchoolScheduleConfigAction(),
    ]);

  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t.name]));
  const workingDays = scheduleConfig?.workingDays ?? [0, 1, 2, 3, 4];

  const scheduleSlots = schedule?.scheduleSlots ?? [];

  return (
    <PortalShell title="Schedule" navItems={schoolAdminNav} userName={ctx.name}>
      <ScheduleControls periods={periods} readiness={readiness} />
      <ScheduleDayView
        periods={periods}
        sections={sections.map((s) => ({ id: s.id, name: s.name }))}
        workingDays={workingDays}
        initialSectionId={params.section}
      />

      {schedule && (
        <ScheduleEditPanel slots={schedule.scheduleSlots} teachers={teachers} />
      )}

      {schedule ? (
        <ScheduleSectionView
          sections={sections.map((s) => ({ id: s.id, name: s.name }))}
          periods={periods}
          workingDays={workingDays}
          slots={scheduleSlots}
          teacherMap={teacherMap}
          initialSectionId={params.section}
        />
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Class Timetable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-2 py-4 text-center">No schedule generated yet.</p>
          </CardContent>
        </Card>
      )}

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
