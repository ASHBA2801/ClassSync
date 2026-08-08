import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { EmployeesSectionNav } from "@/components/employees/employees-section-nav";
import { schoolAdminNav } from "@/lib/nav-config";

export default async function EmployeesMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SCHOOL_ADMIN") redirect("/login");

  return (
    <PortalShell title="Employees" navItems={schoolAdminNav} userName={ctx.name}>
      <div className="space-y-6">
        <EmployeesSectionNav />
        {children}
      </div>
    </PortalShell>
  );
}
