import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolTeachersAction, listSwapGroupsAction } from "@/actions/smart-scheduler";
import { TeacherSwapForm } from "./teacher-swap-form";
import { teacherNav } from "@/lib/nav-config";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TeacherSwapsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "TEACHER") redirect("/login");

  const [teachers, swapGroups] = await Promise.all([
    listSchoolTeachersAction(),
    listSwapGroupsAction(),
  ]);

  return (
    <PortalShell title="Schedule Swaps" navItems={teacherNav} userName={ctx.name}>
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/teacher/schedule">← Back to Schedule</Link>
        </Button>
      </div>
      <TeacherSwapForm
        currentTeacherId={ctx.userId}
        teachers={teachers}
        swapGroups={swapGroups}
      />
    </PortalShell>
  );
}
