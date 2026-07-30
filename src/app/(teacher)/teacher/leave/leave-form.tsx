"use client";

import { useState } from "react";
import { submitTeacherLeaveAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LeaveRequestForm() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await submitTeacherLeaveAction({
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      reason: fd.get("reason") as string,
    });
    setDone(true);
    setLoading(false);
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Start Date</Label><Input name="startDate" type="date" required /></div>
      <div><Label>End Date</Label><Input name="endDate" type="date" required /></div>
      <div><Label>Reason</Label><Input name="reason" required /></div>
      {done && <p className="text-sm text-green-600">Leave request submitted</p>}
      <Button type="submit" disabled={loading}>Submit</Button>
    </form>
  );
}
