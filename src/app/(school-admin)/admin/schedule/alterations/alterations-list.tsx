"use client";

import { useTransition } from "react";
import { cancelAlterationAction } from "@/actions/smart-scheduler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Alteration {
  id: string;
  date: Date;
  periodNo: number;
  type: string;
  priorityLevel: number | null;
  status: string;
  originalTeacherId: string;
  substituteTeacherId: string;
  classSection: { name: string };
  subject: { name: string };
  leaveRequest: { id: string } | null;
}

export function AlterationsList({ alterations }: { alterations: Alteration[] }) {
  const [pending, startTransition] = useTransition();

  function handleCancel(id: string) {
    startTransition(async () => {
      await cancelAlterationAction(id);
      window.location.reload();
    });
  }

  if (alterations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-text-2">No schedule alterations found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Alterations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alterations.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(a.date).toISOString().slice(0, 10)}
                </TableCell>
                <TableCell>P{a.periodNo}</TableCell>
                <TableCell>{a.classSection.name}</TableCell>
                <TableCell>{a.subject.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" hideIcon>{a.type.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-text-2">
                  {a.priorityLevel ? `Tier ${a.priorityLevel}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={a.status === "ACTIVE" ? "success" : "outline"} hideIcon>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {a.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => handleCancel(a.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
