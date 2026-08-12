"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutVisitorAction, type VisitorLogView } from "@/actions/staff-modules";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString();
}

export function VisitorLogsTable({
  logs,
  canCheckout = false,
}: {
  logs: VisitorLogView[];
  canCheckout?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function checkout(id: string) {
    setBusyId(id);
    try {
      await checkoutVisitorAction(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (logs.length === 0) {
    return (
      <p className="rounded-[var(--radius-sm)] border border-border bg-surface-nested px-4 py-8 text-center text-sm text-text-2">
        No entry logs yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Photo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile No</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Logged By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                {log.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={log.photoUrl}
                    alt={log.visitorName}
                    className="h-12 w-12 rounded-[var(--radius-sm)] border border-border object-cover"
                  />
                ) : (
                  <span className="text-xs text-text-3">—</span>
                )}
              </TableCell>
              <TableCell className="font-medium">{log.visitorName}</TableCell>
              <TableCell className="text-text-2">{log.phone ?? "—"}</TableCell>
              <TableCell>{log.purpose}</TableCell>
              <TableCell className="whitespace-nowrap text-text-2">
                {formatWhen(log.checkInAt)}
              </TableCell>
              <TableCell>
                {log.checkOutAt ? (
                  <span className="whitespace-nowrap text-text-2">
                    {formatWhen(log.checkOutAt)}
                  </span>
                ) : canCheckout ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === log.id}
                    onClick={() => checkout(log.id)}
                  >
                    {busyId === log.id ? "…" : "Check Out"}
                  </Button>
                ) : (
                  <span className="text-text-3">On campus</span>
                )}
              </TableCell>
              <TableCell className="text-text-2">{log.loggedBy.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
