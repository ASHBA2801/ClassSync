import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { AttendanceFlow } from "./attendance-flow";

const navItems = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/schedule", label: "Schedule" },
  { href: "/teacher/attendance", label: "Mark Attendance" },
  { href: "/teacher/leave", label: "Leave Requests" },
];

export default async function TeacherAttendancePage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  return (
    <PortalShell title="Mark Attendance" navItems={navItems} userName={ctx.name}>
      <AttendanceFlow />
    </PortalShell>
  );
}
