import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  listStudentsAction,
  listSchoolUsersAction,
  listClassSectionsAction,
} from "@/actions/school-admin";
import { listEscalatedAttendanceAction } from "@/actions/attendance";
import { listLeaveRequestsForReviewAction } from "@/actions/parent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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

export default async function AdminDashboardPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [students, teachers, classes, escalations, leaveRequests] = await Promise.all([
    listStudentsAction(),
    listSchoolUsersAction("TEACHER"),
    listClassSectionsAction(),
    listEscalatedAttendanceAction(),
    listLeaveRequestsForReviewAction(),
  ]);

  return (
    <PortalShell title="School Admin" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-base">Students</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{students.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Teachers</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{teachers.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Escalations</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-red-600">{escalations.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Pending Leave</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{leaveRequests.length}</p></CardContent></Card>
      </div>
      {escalations.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Attendance Escalations</CardTitle></CardHeader>
          <CardContent>
            <Link href="/admin/attendance" className="text-sm text-blue-600 hover:underline">
              Review {escalations.length} escalated attendance record(s)
            </Link>
          </CardContent>
        </Card>
      )}
    </PortalShell>
  );
}
