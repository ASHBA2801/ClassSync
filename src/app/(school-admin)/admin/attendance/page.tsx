import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  listEscalatedAttendanceAction,
  listTeacherAttendanceRecordsAction,
} from "@/actions/attendance";
import { listEscalatedStaffAttendanceAction } from "@/actions/staff-modules";
import { AttendanceReview } from "./attendance-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function AttendancePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [teacherEscalated, staffEscalated, teacherRecords] = await Promise.all([
    listEscalatedAttendanceAction(),
    listEscalatedStaffAttendanceAction(),
    listTeacherAttendanceRecordsAction(),
  ]);

  const escalated = [
    ...teacherEscalated.map((r) => ({
      kind: "teacher" as const,
      id: r.id,
      name: r.teacher.name,
      attempts: r.attempts,
    })),
    ...staffEscalated.map((r) => ({
      kind: "staff" as const,
      id: r.id,
      name: r.employee.user.name,
      attempts: r.attempts,
    })),
  ];

  return (
    <PortalShell title="Attendance" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Escalated Attendance</CardTitle>
              {escalated.length > 0 && (
                <Badge variant="danger">{escalated.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <AttendanceReview records={escalated} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Teacher Records</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teacherRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.teacher.name}</TableCell>
                    <TableCell className="text-text-2">{r.date.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "PRESENT" ? "success" :
                          r.status === "ESCALATED" ? "danger" :
                          "warning"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-2">{r.method ?? "face_recognition"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
