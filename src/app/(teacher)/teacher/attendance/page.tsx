import { PortalShell } from "@/components/portal-shell";
import { getFaceEnrollmentStatusAction } from "@/actions/attendance";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { AttendanceFlow } from "./attendance-flow";
import { teacherNav } from "@/lib/nav-config";

export default async function TeacherAttendancePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const { enrolled } = await getFaceEnrollmentStatusAction();

  return (
    <PortalShell title="Mark Attendance" navItems={teacherNav} userName={ctx.name}>
      <AttendanceFlow faceEnrolled={enrolled} />
    </PortalShell>
  );
}
