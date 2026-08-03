"use client";

import { reviewLeaveRequestAction } from "@/actions/parent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-text-2">No pending leave requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Pending Requests</CardTitle>
          <Badge variant="warning">{requests.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.requester.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" hideIcon>{r.requesterType}</Badge>
                </TableCell>
                <TableCell className="text-text-2">{r.student?.name ?? "Self"}</TableCell>
                <TableCell className="text-xs text-text-2 whitespace-nowrap">
                  {r.startDate.toISOString().slice(0, 10)} → {r.endDate.toISOString().slice(0, 10)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-text-2">{r.reason}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => reviewLeaveRequestAction({ leaveRequestId: r.id, status: "APPROVED" })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => reviewLeaveRequestAction({ leaveRequestId: r.id, status: "REJECTED" })}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
