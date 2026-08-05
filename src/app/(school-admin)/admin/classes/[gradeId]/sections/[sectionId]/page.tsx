import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { listSubjectsByGradeAction, listSchoolUsersAction } from "@/actions/school-admin";
import { SectionDetail } from "../../../section-detail";
import { schoolAdminNav } from "@/lib/nav-config";
import { getSectionForSchool } from "@/lib/school/queries";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ gradeId: string; sectionId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN" || !ctx.schoolId) redirect("/login");

  const { gradeId, sectionId } = await params;
  const { from } = await searchParams;
  const backHref = from === "schedule-setup" ? "/admin/schedule/setup?step=4" : undefined;
  const backLabel =
    from === "schedule-setup" ? "Back to Timetable Setup" : undefined;

  const [section, subjects, teachers] = await Promise.all([
    getSectionForSchool(ctx.schoolId, sectionId),
    listSubjectsByGradeAction(gradeId),
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
        gradeSubjects={subjects.map((s) => ({
          subjectId: s.id,
          periodsPerWeek: s.periodsPerWeek,
          subject: { id: s.id, name: s.name },
        }))}
        assignments={section.teacherAssignments}
        teachers={teachers}
        backHref={backHref}
        backLabel={backLabel}
      />
    </PortalShell>
  );
}
