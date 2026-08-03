import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import {
  getSectionAction,
  listGradeSubjectsAction,
  listSchoolUsersAction,
} from "@/actions/school-admin";
import { SectionDetail } from "../../../section-detail";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ gradeId: string; sectionId: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const { gradeId, sectionId } = await params;
  const [section, gradeSubjects, teachers] = await Promise.all([
    getSectionAction(sectionId),
    listGradeSubjectsAction(gradeId),
    listSchoolUsersAction("TEACHER"),
  ]);

  if (!section || section.gradeId !== gradeId) notFound();

  return (
    <PortalShell
      title={`${section.gradeRef.name} - Section ${section.section}`}
      navItems={schoolAdminNav}
      userName={ctx.name}
    >
      <SectionDetail
        gradeId={gradeId}
        gradeName={section.gradeRef.name}
        sectionId={section.id}
        sectionLabel={section.section}
        gradeSubjects={gradeSubjects}
        assignments={section.teacherAssignments}
        teachers={teachers}
      />
    </PortalShell>
  );
}
