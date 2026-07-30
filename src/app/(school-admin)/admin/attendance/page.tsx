import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  listEscalatedAttendanceAction,
  listTeacherAttendanceRecordsAction,
} from "@/actions/attendance";
import { AttendanceReview } from "./attendance-review";
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

export default async function AttendancePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [escalated, records] = await Promise.all([
    listEscalatedAttendanceAction(),
    listTeacherAttendanceRecordsAction(),
  ]);

  return (
    <PortalShell title="Attendance" navItems={navItems} userName={ctx.name}>
      <Card>
        <CardHeader><CardTitle>Escalated Attendance ({escalated.length})</CardTitle></CardHeader>
        <CardContent>
          <AttendanceReview records={escalated} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>All Records</CardTitle></CardHeader>
        <CardContent>
          {records.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-2 text-sm">
              <span>{r.teacher.name}</span>
              <span>{r.date.toISOString().slice(0, 10)} · {r.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
