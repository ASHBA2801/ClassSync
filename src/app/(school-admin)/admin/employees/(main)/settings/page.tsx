import { listEnabledJobTypesAction } from "@/actions/employees";
import { JobTypeSettings } from "@/components/employees/job-type-settings";

export default async function EmployeeSettingsPage() {
  const configs = await listEnabledJobTypesAction();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-1">Job Types</h2>
        <p className="text-sm text-text-2">
          Choose which roles appear when adding employees and set minimum leave allowances before salary
          deductions apply.
        </p>
      </div>
      <JobTypeSettings configs={configs} />
    </div>
  );
}
