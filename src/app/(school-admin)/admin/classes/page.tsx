import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listGradesAction, listSubjectsAction } from "@/actions/school-admin";
import { GradesList } from "./grades-list";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function ClassesPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const [grades, subjects] = await Promise.all([
    listGradesAction(),
    listSubjectsAction(),
  ]);

  return (
    <PortalShell title="Classes & Grades" navItems={schoolAdminNav} userName={ctx.name}>
      <GradesList grades={grades} subjects={subjects} />
    </PortalShell>
  );
}
