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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { schoolAdminNav } from "@/lib/nav-config";
import Link from "next/link";
import { GraduationCap, UserCheck, AlertTriangle, Clock } from "lucide-react";

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
    <PortalShell title="School Admin" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Students</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{students.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Teachers</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{teachers.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Escalations</p>
                  <p className="text-2xl font-semibold text-danger mt-1">{escalations.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-danger-light">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-2">Pending Leave</p>
                  <p className="text-2xl font-semibold text-text-1 mt-1">{leaveRequests.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-warning-light">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Escalation alert */}
        {escalations.length > 0 && (
          <Card className="border-danger/20 bg-danger-light">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <div>
                  <p className="text-sm font-medium text-text-1">Attendance Escalations</p>
                  <p className="text-sm text-text-2">{escalations.length} record(s) need review</p>
                </div>
              </div>
              <Link
                href="/admin/attendance"
                className="inline-flex items-center rounded-[var(--radius-sm)] bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90 transition-colors"
              >
                Review
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
