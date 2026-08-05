import { PortalShell } from "@/components/portal-shell";
import { SetupStepper, type SetupStepDef } from "@/components/setup-stepper";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import {
  getScheduleSetupStatusAction,
  getSchoolScheduleConfigAction,
  listPeriodTimingsAction,
  listScheduleConstraintsAction,
} from "@/actions/scheduler";
import { listSchoolUsersAction } from "@/actions/school-admin";
import { withTenantContext } from "@/lib/db/prisma";
import { schoolAdminNav } from "@/lib/nav-config";
import { GradesStep } from "./steps/grades-step";
import { PeriodsStep } from "./steps/periods-step";
import { SubjectsStep } from "./steps/subjects-step";
import { TeachersStep } from "./steps/teachers-step";
import { ReviewStep } from "./steps/review-step";
import { Card, CardContent } from "@/components/ui/card";

function stepComplete(readiness: Awaited<ReturnType<typeof getScheduleSetupStatusAction>>, steps: string[]) {
  return steps.every((step) => readiness.checks.find((c) => c.step === step)?.passed ?? false);
}

export default async function ScheduleSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");
  if (!ctx.schoolId) redirect("/login");

  const schoolId = ctx.schoolId;

  const params = await searchParams;
  const currentStep = Math.min(5, Math.max(1, Number(params.step) || 1));

  const [readiness, periods, constraints, teachers, scheduleConfig, grades] = await Promise.all([
    getScheduleSetupStatusAction(),
    listPeriodTimingsAction(),
    listScheduleConstraintsAction(),
    listSchoolUsersAction("TEACHER"),
    getSchoolScheduleConfigAction(),
    withTenantContext(schoolId, async (tx) => {
      return tx.grade.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          classSections: { select: { id: true, name: true } },
          subjects: {
            orderBy: { name: "asc" },
          },
        },
      });
    }),
  ]);

  const sections = await withTenantContext(schoolId, async (tx) => {
    const allSections = await tx.classSection.findMany({
      where: { schoolId },
      include: {
        gradeRef: true,
        teacherAssignments: {
          include: { teacher: true },
        },
      },
      orderBy: [{ gradeRef: { sortOrder: "asc" } }, { section: "asc" }],
    });

    const subjectMap = new Map<
      string,
      Array<{ id: string; name: string }>
    >();
    for (const grade of grades) {
      subjectMap.set(grade.id, grade.subjects ?? []);
    }

    return allSections.map((section) => ({
      id: section.id,
      name: section.name,
      gradeId: section.gradeId,
      gradeName: section.gradeRef.name,
      subjects: (subjectMap.get(section.gradeId) ?? []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
      assignments: section.teacherAssignments.map((a) => ({
        subjectId: a.subjectId,
        teacher: { id: a.teacher.id, name: a.teacher.name },
      })),
    }));
  });

  const step1Complete = stepComplete(readiness, ["grades", "sections"]);
  const step2Complete = stepComplete(readiness, ["periods"]);
  const step3Complete = stepComplete(readiness, ["subjects"]);
  const step4Complete = stepComplete(readiness, ["assignments", "constraints"]);

  const stepDefs: SetupStepDef[] = [
    {
      id: 1,
      label: "Grades & Sections",
      href: "/admin/schedule/setup?step=1",
      complete: step1Complete,
      accessible: true,
    },
    {
      id: 2,
      label: "Sessions",
      href: "/admin/schedule/setup?step=2",
      complete: step2Complete,
      accessible: step1Complete,
    },
    {
      id: 3,
      label: "Subjects",
      href: "/admin/schedule/setup?step=3",
      complete: step3Complete,
      accessible: step1Complete && step2Complete,
    },
    {
      id: 4,
      label: "Teachers & Rules",
      href: "/admin/schedule/setup?step=4",
      complete: step4Complete,
      accessible: step1Complete && step2Complete && step3Complete,
    },
    {
      id: 5,
      label: "Review",
      href: "/admin/schedule/setup?step=5",
      complete: readiness.isReady,
      accessible: step1Complete && step2Complete && step3Complete && step4Complete,
    },
  ];

  const activeStepDef = stepDefs.find((s) => s.id === currentStep);
  if (activeStepDef && !activeStepDef.accessible && currentStep > 1) {
    redirect("/admin/schedule/setup?step=1");
  }

  const gradesForSteps = grades.map((g) => ({
    id: g.id,
    name: g.name,
    classSections: g.classSections.map((s) => ({ id: s.id, name: s.name })),
    subjects: (g.subjects ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      periodsPerWeek: s.periodsPerWeek,
    })),
  }));

  return (
    <PortalShell title="Timetable Setup" navItems={schoolAdminNav} userName={ctx.name}>
      <SetupStepper steps={stepDefs} currentStep={currentStep} />

      {!activeStepDef?.accessible && currentStep > 1 && (
        <Card className="mb-4 border-warning">
          <CardContent className="pt-4 text-sm text-warning">
            Complete previous steps before accessing this step.
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && <GradesStep readiness={readiness} grades={gradesForSteps} />}
      {currentStep === 2 && (
        <PeriodsStep periods={periods} readiness={readiness} scheduleConfig={scheduleConfig} />
      )}
      {currentStep === 3 && (
        <SubjectsStep readiness={readiness} grades={gradesForSteps} />
      )}
      {currentStep === 4 && (
        <TeachersStep
          readiness={readiness}
          constraints={constraints}
          teachers={teachers.map((t) => ({ id: t.user.id, name: t.user.name }))}
          sections={sections}
        />
      )}
      {currentStep === 5 && <ReviewStep readiness={readiness} />}
    </PortalShell>
  );
}
