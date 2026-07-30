"use client";

import { overrideAttendanceAction } from "@/actions/attendance";
import { Button } from "@/components/ui/button";

interface Record {
  id: string;
  teacher: { name: string };
  attempts: { attemptNumber: number; evidenceImageKey: string | null }[];
}

export function AttendanceReview({ records }: { records: Record[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-zinc-500">No escalations pending review.</p>;
  }

  return (
    <div className="space-y-4">
      {records.map((r) => (
        <div key={r.id} className="rounded border p-4">
          <p className="font-medium">{r.teacher.name}</p>
          <p className="text-sm text-zinc-500">{r.attempts.length} attempt(s)</p>
          <div className="mt-2 flex gap-2">
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
        </div>
      ))}
    </div>
  );
}
