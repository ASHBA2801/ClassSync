import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect, notFound } from "next/navigation";
import { getEmployeeAction } from "@/actions/employees";
import { EmployeeDetailTabs, getEmployeeDefaultTab } from "@/components/employees/employee-detail-tabs";
import { schoolAdminNav } from "@/lib/nav-config";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function EmployeeDetailPage({ params, searchParams }: Props) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  const { id } = await params;
  const { tab } = await searchParams;
  const employee = await getEmployeeAction(id);
  if (!employee) notFound();

  const validTabs = ["profile", "salary", "bank"] as const;
  const defaultTab = validTabs.includes(tab as typeof validTabs[number])
    ? (tab as typeof validTabs[number])
    : getEmployeeDefaultTab(employee);

  return (
    <PortalShell title={employee.user.name} navItems={schoolAdminNav} userName={ctx.name}>
      <div className="mb-4">
        <Link href="/admin/employees" className="text-sm text-text-2 hover:underline">
          ← Back to Employees
        </Link>
      </div>
      <EmployeeDetailTabs key={defaultTab} employee={employee} defaultTab={defaultTab} />
    </PortalShell>
  );
}
