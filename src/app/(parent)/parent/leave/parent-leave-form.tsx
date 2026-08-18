"use client";

import { useState } from "react";
import { submitParentLeaveAction, getMedicalCertUploadUrlAction } from "@/actions/parent";
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
import { Paperclip, SunMedium, FileText, CheckCircle2, AlertCircle, Upload } from "lucide-react";

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
  const [leaveCategory, setLeaveCategory] = useState<string>("FULL_DAY");
  const [medicalCertFile, setMedicalCertFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentId) {
      setError("Please select a student.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    setError(null);
    setDone(false);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const reason = fd.get("reason") as string;

    const isHalfDay = leaveCategory === "HALF_DAY_MORNING" || leaveCategory === "HALF_DAY_AFTERNOON";
    const halfDaySession = leaveCategory === "HALF_DAY_AFTERNOON" ? "SECOND_HALF" : isHalfDay ? "FIRST_HALF" : undefined;

    let medicalCertS3Key: string | undefined;
    let medicalCertName: string | undefined;

    try {
      // Upload medical certificate if selected
      if (medicalCertFile) {
        setUploading(true);
        const { uploadUrl, key } = await getMedicalCertUploadUrlAction({
          filename: medicalCertFile.name,
          mimeType: medicalCertFile.type,
        });

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": medicalCertFile.type || "application/octet-stream" },
          body: medicalCertFile,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload medical certificate file.");
        }

        medicalCertS3Key = key;
        medicalCertName = medicalCertFile.name;
        setUploading(false);
      }

      await submitParentLeaveAction({
        studentId,
        startDate,
        endDate,
        reason,
        isHalfDay,
        halfDaySession,
        medicalCertS3Key,
        medicalCertName,
      });

      setDone(true);
      setStudentId("");
      setStartDate("");
      setEndDate("");
      setLeaveCategory("FULL_DAY");
      setMedicalCertFile(null);
      e.currentTarget.reset();
    } catch (err: any) {
      setError(err.message || "Could not submit leave request. Check the dates and try again.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Student</Label>
        <Select value={studentId || undefined} onValueChange={setStudentId}>
          <SelectTrigger className="mt-1">
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

      <div>
        <Label>Leave Duration Type</Label>
        <Select value={leaveCategory} onValueChange={setLeaveCategory}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL_DAY">Full Day Leave</SelectItem>
            <SelectItem value="HALF_DAY_MORNING">Half Day Leave (Morning / 1st Half)</SelectItem>
            <SelectItem value="HALF_DAY_AFTERNOON">Half Day Leave (Afternoon / 2nd Half)</SelectItem>
            <SelectItem value="MEDICAL">Medical Leave (With Certificate)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Start Date</Label>
          <div className="mt-1">
            <DatePicker name="startDate" value={startDate} onChange={setStartDate} required />
          </div>
        </div>
        <div>
          <Label>End Date</Label>
          <div className="mt-1">
            <DatePicker name="endDate" value={endDate} onChange={setEndDate} required />
          </div>
        </div>
      </div>

      <div>
        <Label>Reason for Leave</Label>
        <Input name="reason" placeholder="State the reason for leave..." required className="mt-1" />
      </div>

      {/* Medical Certificate Upload Section */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-2">
        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Paperclip className="h-4 w-4 text-blue-600" />
          Medical Certificate Upload (Optional)
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Attach a doctor's note or medical certificate (PDF, JPG, PNG).
        </p>

        <div className="flex items-center gap-2 mt-1">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setMedicalCertFile(e.target.files?.[0] || null)}
            className="text-xs bg-background cursor-pointer"
          />
        </div>

        {medicalCertFile && (
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">
            Selected: {medicalCertFile.name} ({(medicalCertFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-md border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Leave request submitted successfully!</span>
        </div>
      )}

      <Button type="submit" disabled={submitting || uploading} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading Certificate..." : submitting ? "Submitting Request..." : "Submit Leave Request"}
      </Button>
    </form>
  );
}
