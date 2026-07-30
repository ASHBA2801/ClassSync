import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getSchoolSettingsAction } from "@/actions/school-admin";
import { SettingsForms } from "./settings-forms";

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

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const school = await getSchoolSettingsAction();

  return (
    <PortalShell title="School Settings" navItems={navItems} userName={ctx.name}>
      <SettingsForms
        school={
          school
            ? {
                campusLat: school.campusLat,
                campusLng: school.campusLng,
                campusRadiusM: school.campusRadiusM,
                timezone: school.timezone,
                name: school.name,
              }
            : null
        }
      />
    </PortalShell>
  );
}
