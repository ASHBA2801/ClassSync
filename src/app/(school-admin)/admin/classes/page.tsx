import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  listClassSectionsAction,
  listSubjectsAction,
  listSchoolUsersAction,
} from "@/actions/school-admin";
import { listTeacherAssignmentsAction } from "@/actions/scheduler";
import { ClassManagementForms } from "./class-forms";
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

export default async function ClassesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [classes, subjects, teachers, assignments] = await Promise.all([
    listClassSectionsAction(),
    listSubjectsAction(),
    listSchoolUsersAction("TEACHER"),
    listTeacherAssignmentsAction(),
  ]);

  return (
    <PortalShell title="Classes & Subjects" navItems={navItems} userName={ctx.name}>
      <ClassManagementForms
        classes={classes}
        subjects={subjects}
        teachers={teachers}
      />
      <Card className="mt-6">
        <CardHeader><CardTitle>Teacher Assignments</CardTitle></CardHeader>
        <CardContent>
          {assignments.map((a) => (
            <div key={a.id} className="border-b py-2 text-sm">
              {a.teacher.name} → {a.subject.name} ({a.classSection.name})
            </div>
          ))}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
