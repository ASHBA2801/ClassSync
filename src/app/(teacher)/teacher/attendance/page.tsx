import { PortalShell } from "@/components/portal-shell";
import { getFaceEnrollmentStatusAction } from "@/actions/attendance";
import {
  getTeacherAssignedClassSectionsAction,
  getTeacherStudentLeaveRequestsAction,
} from "@/actions/student-attendance";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { AttendanceFlow } from "./attendance-flow";
import { StudentAttendanceTracker } from "@/components/teacher/student-attendance-tracker";
import { StudentLeaveReviewList } from "@/components/teacher/student-leave-review";
import { teacherNav } from "@/lib/nav-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, FileText, Camera } from "lucide-react";

export default async function TeacherAttendancePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const [{ enrolled }, classSections, leaveRequests] = await Promise.all([
    getFaceEnrollmentStatusAction(),
    getTeacherAssignedClassSectionsAction(),
    getTeacherStudentLeaveRequestsAction(),
  ]);

  const pendingLeavesCount = leaveRequests.filter((r) => r.status === "PENDING").length;

  return (
    <PortalShell title="Attendance & Leave Portal" navItems={teacherNav} userName={ctx.name}>
      <Tabs defaultValue="tracker" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl bg-card border shadow-xs p-1">
          <TabsTrigger value="tracker" className="gap-2 text-xs font-semibold">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span>Student Attendance</span>
          </TabsTrigger>

          <TabsTrigger value="leave-requests" className="gap-2 text-xs font-semibold relative">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Student Leaves</span>
            {pendingLeavesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingLeavesCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="teacher-checkin" className="gap-2 text-xs font-semibold">
            <Camera className="h-4 w-4 text-purple-600" />
            <span>My Check-in</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="mt-0">
          <StudentAttendanceTracker classSections={classSections} />
        </TabsContent>

        <TabsContent value="leave-requests" className="mt-0">
          <StudentLeaveReviewList initialRequests={leaveRequests} />
        </TabsContent>

        <TabsContent value="teacher-checkin" className="mt-0">
          <div className="max-w-2xl mx-auto pt-2">
            <AttendanceFlow faceEnrolled={enrolled} />
          </div>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}
