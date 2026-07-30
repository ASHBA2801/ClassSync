"use client";

import { useState } from "react";
import { createStudentAction } from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClassOption {
  id: string;
  name: string;
}

export function CreateStudentForm({ classes }: { classes: ClassOption[] }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createStudentAction({
      name: fd.get("name") as string,
      classSectionId: (fd.get("classSectionId") as string) || undefined,
      admissionNo: (fd.get("admissionNo") as string) || undefined,
      dob: (fd.get("dob") as string) || undefined,
    });
    setDone(true);
    setLoading(false);
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Admission No</Label><Input name="admissionNo" /></div>
      <div><Label>Date of Birth</Label><Input name="dob" type="date" /></div>
      <div>
        <Label>Class</Label>
        <select name="classSectionId" className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {done && <p className="text-sm text-green-600">Student created</p>}
      <Button type="submit" disabled={loading}>Add Student</Button>
    </form>
  );
}
