"use client";

import { reviewLeaveRequestAction } from "@/actions/parent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Request {
  id: string;
  requesterType: string;
  reason: string;
  startDate: Date;
  endDate: Date;
  requester: { name: string };
  student: { name: string } | null;
}

export function LeaveReviewList({ requests }: { requests: Request[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-zinc-500">No pending leave requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <p className="font-medium">{r.requester.name} ({r.requesterType})</p>
            {r.student && <p className="text-sm text-zinc-500">Student: {r.student.name}</p>}
            <p className="text-sm">{r.reason}</p>
            <p className="text-xs text-zinc-400">
              {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => reviewLeaveRequestAction({ leaveRequestId: r.id, status: "APPROVED" })}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reviewLeaveRequestAction({ leaveRequestId: r.id, status: "REJECTED" })}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
