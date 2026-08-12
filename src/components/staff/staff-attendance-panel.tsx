"use client";

import { useRouter } from "next/navigation";
import {
  submitStaffAttendanceAction,
  getStaffAttendanceStatusAction,
} from "@/actions/staff-modules";
import { enrollFaceAction } from "@/actions/attendance";
import { FaceAttendanceFlow } from "@/components/attendance/face-attendance-flow";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Record {
  id: string;
  date: Date;
  status: string;
  checkInAt: Date | null;
  method: string | null;
}

function statusVariant(status: string): "success" | "danger" | "warning" | "default" {
  if (status === "PRESENT") return "success";
  if (status === "ESCALATED" || status === "FAILED") return "danger";
  if (status === "PROCESSING") return "warning";
  return "default";
}

export function StaffAttendancePanel({
  records,
  faceEnrolled,
}: {
  records: Record[];
  faceEnrolled: boolean;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => r.date.toISOString().slice(0, 10) === today);
  const canMarkToday = !todayRecord || !["PRESENT", "PROCESSING"].includes(todayRecord.status);

  return (
    <div className="space-y-6">
      <FaceAttendanceFlow
        initiallyEnrolled={faceEnrolled}
        canMarkAttendance={canMarkToday}
        actions={{
          submit: submitStaffAttendanceAction,
          getStatus: async (attendanceId) => {
            const record = await getStaffAttendanceStatusAction(attendanceId);
            if (record && record.status !== "PROCESSING") {
              router.refresh();
            }
            return record ? { status: record.status } : null;
          },
          enrollFace: async (imageBase64) => {
            await enrollFaceAction(imageBase64);
            router.refresh();
          },
        }}
      />

      {todayRecord?.status === "PRESENT" && (
        <p className="text-sm text-success">You are marked present for today.</p>
      )}

      {todayRecord?.status === "PROCESSING" && (
        <p className="text-sm text-warning">Today&apos;s attendance is being verified...</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Check In</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.date.toISOString().slice(0, 10)}</TableCell>
              <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
              <TableCell className="text-text-2">{r.method ?? "—"}</TableCell>
              <TableCell className="text-text-2">{r.checkInAt?.toLocaleTimeString() ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
