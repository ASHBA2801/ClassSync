import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { getCalendarMonthAction } from "@/actions/school-calendar";
import { WorkingDayCalendar } from "@/components/calendar/working-day-calendar";
import { schoolAdminNav } from "@/lib/nav-config";

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;

  const calendar = await getCalendarMonthAction(year, month);

  return (
    <PortalShell title="Working Day Calendar" navItems={schoolAdminNav} userName={ctx.name}>
      <WorkingDayCalendar
        year={calendar.year}
        month={calendar.month}
        days={calendar.days}
        weekdayTemplate={calendar.weekdayTemplate}
      />
    </PortalShell>
  );
}
