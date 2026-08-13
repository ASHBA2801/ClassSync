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

export function ParentLeaveForm({
  students,
  defaultStudentId,
}: {
  students: Student[];
  defaultStudentId?: string;
}) {
  const [studentId, setStudentId] = useState(
    () => defaultStudentId && students.some((s) => s.id === defaultStudentId)
      ? defaultStudentId
      : students.length === 1
        ? students[0]!.id
        : "",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentId) return;
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submitParentLeaveAction({
        studentId,
        startDate,
        endDate,
        reason: fd.get("reason") as string,
      });
      setDone(true);
      setStudentId("");
      setStartDate("");
      setEndDate("");
      e.currentTarget.reset();
    } catch {
      setError("Could not submit leave request. Check the dates and try again.");
    }
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
      <div><Label>Start Date</Label><DatePicker name="startDate" value={startDate} onChange={setStartDate} required /></div>
      <div><Label>End Date</Label><DatePicker name="endDate" value={endDate} onChange={setEndDate} required /></div>
      <div><Label>Reason</Label><Input name="reason" required /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm text-success">Leave request submitted</p>}
      <Button type="submit">Submit</Button>
    </form>
  );
}
