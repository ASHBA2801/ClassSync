import { listEnabledJobTypesAction } from "@/actions/employees";
import { CreateEmployeeForm } from "@/components/employees/create-employee-form";

export default async function NewEmployeePage() {
  const jobTypes = await listEnabledJobTypesAction();

  return (
    <div className="glass-card max-w-2xl p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text-1">Add Employee</h2>
        <p className="text-sm text-text-2">
          Create a new staff account. You will set salary and bank details on the next screen.
        </p>
      </div>
      <CreateEmployeeForm enabledJobTypes={jobTypes} />
    </div>
  );
}
