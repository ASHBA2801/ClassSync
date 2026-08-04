import { PortalShell } from "@/components/portal-shell";

import { getSessionContext } from "@/lib/rbac/guard";

import { redirect, notFound } from "next/navigation";

import { getGradeAction } from "@/actions/school-admin";

import { GradeDetail } from "../grade-detail";

import { schoolAdminNav } from "@/lib/nav-config";



export default async function GradePage({

  params,

}: {

  params: Promise<{ gradeId: string }>;

}) {

  const ctx = await getSessionContext();

  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");



  const { gradeId } = await params;

  const grade = await getGradeAction(gradeId);



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

