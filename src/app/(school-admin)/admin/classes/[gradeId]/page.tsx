import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { GradeDetail } from "../grade-detail";
import { schoolAdminNav } from "@/lib/nav-config";
import { getGradeForSchool } from "@/lib/school/queries";

export const dynamic = "force-dynamic";

export default async function GradePage({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN" || !ctx.schoolId) redirect("/login");

  const { gradeId } = await params;
  const grade = await getGradeForSchool(ctx.schoolId, gradeId);

  if (!grade) notFound();

  return (
    <PortalShell title={grade.name} navItems={schoolAdminNav} userName={ctx.name}>
      <GradeDetail
        gradeId={grade.id}
        gradeName={grade.name}
        sections={grade.classSections}
        subjects={grade.subjects}
      />
    </PortalShell>
  );
}
