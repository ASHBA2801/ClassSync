"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logVisitorAction, checkoutVisitorAction } from "@/actions/staff-modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VisitorLog {
  id: string;
  visitorName: string;
  purpose: string;
  phone: string | null;
  checkInAt: Date;
  checkOutAt: Date | null;
  loggedBy: { name: string };
}

export function SecurityVisitorPanel({ logs }: { logs: VisitorLog[] }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleLog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await logVisitorAction({
        visitorName: fd.get("visitorName") as string,
        purpose: fd.get("purpose") as string,
        phone: (fd.get("phone") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      });
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log visitor");
    }
  }

  async function checkout(id: string) {
    await checkoutVisitorAction(id);
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={handleLog} className="glass-card space-y-3 p-4 lg:col-span-1">
        <h3 className="font-medium">Log Visitor</h3>
        <div><Label>Name</Label><Input name="visitorName" required /></div>
        <div><Label>Purpose</Label><Input name="purpose" required /></div>
        <div><Label>Phone</Label><Input name="phone" /></div>
        <div><Label>Notes</Label><Input name="notes" /></div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit">Check In</Button>
      </form>

      <div className="lg:col-span-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.visitorName}</TableCell>
                <TableCell>{log.purpose}</TableCell>
                <TableCell className="text-text-2">{log.checkInAt.toLocaleString()}</TableCell>
                <TableCell>
                  {log.checkOutAt
                    ? log.checkOutAt.toLocaleString()
                    : <Button size="sm" variant="outline" onClick={() => checkout(log.id)}>Check Out</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
