"use client";

import { overrideAttendanceAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Record {
  id: string;
  teacher: { name: string };
  attempts: { attemptNumber: number; evidenceImageKey: string | null }[];
}

export function AttendanceReview({ records }: { records: Record[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-text-2 py-4 text-center">No escalations pending review.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Teacher</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.teacher.name}</TableCell>
            <TableCell className="text-text-2">{r.attempts.length} attempt(s)</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onClick={() => overrideAttendanceAction(r.id, "PRESENT")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => overrideAttendanceAction(r.id, "FAILED")}
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
