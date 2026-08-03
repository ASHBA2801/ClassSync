"use client";

import { useState } from "react";
import { submitParentLeaveAction } from "@/actions/parent";
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
import { DatePicker } from "@/components/ui/date-picker";

interface Student {
  id: string;
  name: string;
}

export function ParentLeaveForm({ students }: { students: Student[] }) {
  const [studentId, setStudentId] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentId) return;

    const fd = new FormData(e.currentTarget);
    await submitParentLeaveAction({
      studentId,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      reason: fd.get("reason") as string,
    });
    setDone(true);
    setStudentId("");
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Student</Label>
        <Select value={studentId || undefined} onValueChange={setStudentId}>
          <SelectTrigger>
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Start Date</Label><DatePicker name="startDate" required /></div>
      <div><Label>End Date</Label><DatePicker name="endDate" required /></div>
      <div><Label>Reason</Label><Input name="reason" required /></div>
      {done && <p className="text-sm text-success">Leave request submitted</p>}
      <Button type="submit">Submit</Button>
    </form>
  );
}
