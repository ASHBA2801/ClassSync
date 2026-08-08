"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeAction } from "@/actions/employees";
import type { EmployeeJobType } from "@prisma/client";
import { JOB_TYPE_LABELS, JOB_CATEGORY_LABELS, getJobTypesByCategory } from "@/lib/employees/job-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordInput } from "@/components/ui/password-input";

interface Props {
  enabledJobTypes: { jobType: EmployeeJobType; isEnabled: boolean }[];
}

export function CreateEmployeeForm({ enabledJobTypes }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [jobType, setJobType] = useState<EmployeeJobType>("CLEANER");

  const enabledSet = new Set(
    enabledJobTypes.filter((j) => j.isEnabled).map((j) => j.jobType),
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);

    try {
      const result = await createEmployeeAction({
        email: fd.get("email") as string,
        name: fd.get("name") as string,
        password: fd.get("password") as string,
        phone: (fd.get("phone") as string) || undefined,
        employeeCode: fd.get("employeeCode") as string,
        jobType,
        department: (fd.get("department") as string) || undefined,
        dateOfJoining: fd.get("dateOfJoining") as string,
        emergencyContact: (fd.get("emergencyContact") as string) || undefined,
      });
      router.push(`/admin/employees/${result.employeeId}?tab=salary`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Email</Label><Input name="email" type="email" required /></div>
      <div><Label>Password</Label><PasswordInput name="password" required /></div>
      <div><Label>Phone</Label><Input name="phone" /></div>
      <div><Label>Employee Code</Label><Input name="employeeCode" required placeholder="EMP-001" /></div>
      <div>
        <Label>Job Type</Label>
        <Select value={jobType} onValueChange={(v) => setJobType(v as EmployeeJobType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(JOB_CATEGORY_LABELS).map(([category, label]) => (
              <div key={category}>
                <p className="px-2 py-1 text-xs font-medium text-text-2">{label}</p>
                {getJobTypesByCategory(category as keyof typeof JOB_CATEGORY_LABELS).map((jt) => (
                  enabledSet.has(jt) ? (
                    <SelectItem key={jt} value={jt}>{JOB_TYPE_LABELS[jt]}</SelectItem>
                  ) : null
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Department</Label><Input name="department" /></div>
      <div><Label>Date of Joining</Label><Input name="dateOfJoining" type="date" required /></div>
      <div className="sm:col-span-2"><Label>Emergency Contact</Label><Input name="emergencyContact" /></div>
      {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit">Create Employee</Button>
      </div>
    </form>
  );
}
