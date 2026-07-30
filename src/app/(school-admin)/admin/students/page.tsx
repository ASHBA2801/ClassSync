import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listStudentsAction, listClassSectionsAction } from "@/actions/school-admin";
import { CreateStudentForm } from "./create-student-form";
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

export default async function StudentsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [students, classes] = await Promise.all([
    listStudentsAction(),
    listClassSectionsAction(),
  ]);

  return (
    <PortalShell title="Students" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add Student</CardTitle></CardHeader>
          <CardContent><CreateStudentForm classes={classes} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Students ({students.length})</CardTitle></CardHeader>
          <CardContent>
            {students.map((s) => (
              <div key={s.id} className="border-b py-2 text-sm">
                <p className="font-medium">{s.name}</p>
                <p className="text-zinc-500">{s.classSection?.name ?? "Unassigned"} · {s.admissionNo}</p>
                <p className="text-zinc-400">{s.guardianRelationships.length} guardian(s)</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
