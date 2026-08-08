"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  generateMonthlyPayrollAction,
  startPayrollPayoutAction,
} from "@/actions/payroll";
import type { PayrollReadiness } from "@/lib/payroll/readiness";
import { PayrollReadinessPanel } from "@/components/employees/payroll-readiness-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PayrollRunRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalAmount: string;
  employeeCount: number;
  approvedBy: { name: string } | null;
  _count: { payouts: number };
}

interface Props {
  runs: PayrollRunRow[];
  readiness: PayrollReadiness;
  payoutWebhookUrl?: string;
}

export function PayrollManagement({ runs, readiness, payoutWebhookUrl }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [year, setYear] = useState(String(readiness.previousMonth.year));
  const [month, setMonth] = useState(String(readiness.previousMonth.month));

  async function generateMonthly() {
    setError("");
    setMessage("");
    try {
      const result = await generateMonthlyPayrollAction({
        year: Number(year),
        month: Number(month),
      });
      setMessage(`Payroll run created. Review it or start payout when ready.`);
      router.push(`/admin/employees/payroll/${result.payrollRunId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate payroll");
    }
  }

  async function startPayout(id: string) {
    setError("");
    setMessage("");
    try {
      const result = await startPayrollPayoutAction(id);
      setMessage(
        `Payout started: ${result.successCount} succeeded, ${result.failCount} failed.` +
        (result.errors.length > 0 ? ` ${result.errors[0]}` : ""),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout execution failed");
    }
  }

  return (
    <div className="space-y-6">
      <PayrollReadinessPanel readiness={readiness} payoutWebhookUrl={payoutWebhookUrl} />

      <div className="glass-card space-y-4 p-4">
        <div>
          <h3 className="font-medium">Generate Payroll</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-2">
            <span>
              Create a payroll run for a calendar month. Previous month ({readiness.previousMonth.label}) status:
            </span>
            <Badge variant={readiness.previousMonth.status === "completed" ? "success" : "warning"}>
              {readiness.previousMonth.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
          </div>
          <div>
            <Label>Month</Label>
            <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="w-24" />
          </div>
          <Button type="button" onClick={generateMonthly}>
            Generate Payroll for {year}-{month.padStart(2, "0")}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && <p className="text-sm text-success">{message}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <Link href={`/admin/employees/payroll/${run.id}`} className="hover:underline">
                  {run.periodStart.slice(0, 10)} — {run.periodEnd.slice(0, 10)}
                </Link>
              </TableCell>
              <TableCell>{run.employeeCount}</TableCell>
              <TableCell>₹{run.totalAmount}</TableCell>
              <TableCell>
                <Badge variant={run.status === "COMPLETED" ? "success" : "warning"}>{run.status}</Badge>
              </TableCell>
              <TableCell className="space-x-2">
                {(run.status === "DRAFT" || run.status === "APPROVED") && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/employees/payroll/${run.id}`}>Review</Link>
                    </Button>
                    <Button size="sm" onClick={() => startPayout(run.id)}>Start Payout</Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
