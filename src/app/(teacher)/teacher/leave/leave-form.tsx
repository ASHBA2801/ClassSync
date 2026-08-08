"use client";

import { useState } from "react";
import { submitTeacherLeaveAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeaveRequestForm() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<"REGULAR" | "OD">("REGULAR");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await submitTeacherLeaveAction({
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      reason: fd.get("reason") as string,
      leaveType,
    });
    setDone(true);
    setLoading(false);
    e.currentTarget.reset();
    setLeaveType("REGULAR");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Start Date</Label><DatePicker name="startDate" required /></div>
      <div><Label>End Date</Label><DatePicker name="endDate" required /></div>
      <div className="space-y-1">
        <Label>Leave type</Label>
        <Select value={leaveType} onValueChange={(value: "REGULAR" | "OD") => setLeaveType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="REGULAR">Regular leave</SelectItem>
            <SelectItem value="OD">On duty (OD)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Reason</Label><Input name="reason" required /></div>
      {done && <p className="text-sm text-success">Leave request submitted</p>}
      <Button type="submit" disabled={loading}>Submit</Button>
    </form>
  );
}
