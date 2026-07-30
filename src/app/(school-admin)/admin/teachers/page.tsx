import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolUsersAction } from "@/actions/school-admin";
import { CreateUserForm } from "@/components/create-user-form";
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

export default async function TeachersPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const teachers = await listSchoolUsersAction("TEACHER");

  return (
    <PortalShell title="Teachers" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add Teacher</CardTitle></CardHeader>
          <CardContent><CreateUserForm role="TEACHER" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Teachers ({teachers.length})</CardTitle></CardHeader>
          <CardContent>
            {teachers.map((t) => (
              <div key={t.id} className="border-b py-2 text-sm">
                <p className="font-medium">{t.user.name}</p>
                <p className="text-zinc-500">{t.user.email}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
