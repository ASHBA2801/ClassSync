"use client";

import { overrideAttendanceAction } from "@/actions/attendance";
import { overrideStaffAttendanceAction } from "@/actions/staff-modules";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeacherRecord {
  kind: "teacher";
  id: string;
  name: string;
  attempts: { attemptNumber: number; evidenceImageKey: string | null }[];
}

interface StaffRecord {
  kind: "staff";
  id: string;
  name: string;
  attempts: { attemptNumber: number; evidenceImageKey: string | null }[];
}

export type EscalatedAttendanceRecord = TeacherRecord | StaffRecord;

export function AttendanceReview({ records }: { records: EscalatedAttendanceRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-text-2 py-4 text-center">No escalations pending review.</p>;
  }

  async function handleOverride(
    record: EscalatedAttendanceRecord,
    status: "PRESENT" | "FAILED" | "ABSENT",
  ) {
    if (record.kind === "teacher") {
      await overrideAttendanceAction(record.id, status);
    } else {
      await overrideStaffAttendanceAction(record.id, status);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={`${r.kind}-${r.id}`}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-text-2 capitalize">{r.kind}</TableCell>
            <TableCell className="text-text-2">{r.attempts.length} attempt(s)</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOverride(r, "PRESENT")}
                >
                  Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOverride(r, "ABSENT")}
                >
                  Absent
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleOverride(r, "FAILED")}
                >
                  Reject
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
