"use client";

import { useState } from "react";
import { submitParentLeaveAction } from "@/actions/parent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Student {
  id: string;
  name: string;
}

export function ParentLeaveForm({ students }: { students: Student[] }) {
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await submitParentLeaveAction({
      studentId: fd.get("studentId") as string,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      reason: fd.get("reason") as string,
    });
    setDone(true);
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Student</Label>
        <select name="studentId" className="flex h-10 w-full rounded-md border px-3 text-sm" required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div><Label>Start Date</Label><Input name="startDate" type="date" required /></div>
      <div><Label>End Date</Label><Input name="endDate" type="date" required /></div>
      <div><Label>Reason</Label><Input name="reason" required /></div>
      {done && <p className="text-sm text-green-600">Leave request submitted</p>}
      <Button type="submit">Submit</Button>
    </form>
  );
}
