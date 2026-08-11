"use client";

import { useState } from "react";
import { submitStaffLeaveAction } from "@/actions/attendance";
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

export function StaffLeaveForm() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<"REGULAR" | "OD">("REGULAR");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await submitStaffLeaveAction({
        startDate,
        endDate,
        reason: fd.get("reason") as string,
        leaveType,
      });
      setDone(true);
      e.currentTarget.reset();
      setStartDate("");
      setEndDate("");
      setLeaveType("REGULAR");
    } catch {
      setError("Could not submit leave request. Check the dates and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Start Date</Label><DatePicker name="startDate" value={startDate} onChange={setStartDate} required /></div>
      <div><Label>End Date</Label><DatePicker name="endDate" value={endDate} onChange={setEndDate} required /></div>
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm text-success">Leave request submitted</p>}
      <Button type="submit" disabled={loading}>Submit</Button>
    </form>
  );
}
