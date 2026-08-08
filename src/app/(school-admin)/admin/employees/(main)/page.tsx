import { listEmployeesAction } from "@/actions/employees";
import { getPayrollReadinessAction } from "@/actions/payroll";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeSetupAlert } from "@/components/employees/employee-setup-alert";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function EmployeesPage({ searchParams }: Props) {
  const params = await searchParams;
  const [employees, readiness] = await Promise.all([
    listEmployeesAction({ category: params.category }),
    getPayrollReadinessAction(),
  ]);

  return (
    <div className="space-y-4">
      <EmployeeSetupAlert readiness={readiness} />
      <div className="glass-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-1">All Employees</h2>
            <p className="text-sm text-text-2">{employees.length} personnel on record</p>
          </div>
        </div>
        <EmployeeList employees={employees} activeCategory={params.category} />
      </div>
    </div>
  );
}
