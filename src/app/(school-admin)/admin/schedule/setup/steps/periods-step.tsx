"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deletePeriodTimingAction,
  upsertPeriodTimingAction,
} from "@/actions/scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleReadiness } from "@/lib/scheduler/readiness";

interface Period {
  periodNo: number;
  startTime: string;
  endTime: string;
}

const emptyForm = { periodNo: "", startTime: "", endTime: "" };

export function PeriodsStep({
  periods,
  readiness,
}: {
  periods: Period[];
  readiness: ScheduleReadiness;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState(emptyForm);
  const [editingPeriodNo, setEditingPeriodNo] = useState<number | null>(null);
  const periodsCheck = readiness.checks.find((c) => c.step === "periods");

  async function refresh() {
    router.refresh();
  }

  function loadPeriodForEdit(period: Period) {
    setEditingPeriodNo(period.periodNo);
    setFormValues({
      periodNo: String(period.periodNo),
      startTime: period.startTime,
      endTime: period.endTime,
    });
    setError(null);
    setSuccess(null);
  }

  function clearForm() {
    setEditingPeriodNo(null);
    setFormValues(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const periodNo = Number(formValues.periodNo);
    const startTime = formValues.startTime.trim();
    const endTime = formValues.endTime.trim();

    try {
      await upsertPeriodTimingAction({ periodNo, startTime, endTime });
      setSuccess(editingPeriodNo ? `Period ${periodNo} updated` : `Period ${periodNo} saved`);
      clearForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save period");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Session (Period) Configuration</h2>
        <p className="text-sm text-text-2 mt-1">
          Define the number of sessions per day and the start/end time for each period.
          Periods must be numbered contiguously from 1.
        </p>
      </div>

      <Badge variant={periodsCheck?.passed ? "success" : "outline"}>
        {periodsCheck?.message ?? "Periods not configured"}
      </Badge>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingPeriodNo ? `Edit Period ${editingPeriodNo}` : "Add Period"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Period #</Label>
                <Input
                  name="periodNo"
                  type="number"
                  min={1}
                  required
                  value={formValues.periodNo}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, periodNo: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input
                  name="startTime"
                  placeholder="08:00"
                  required
                  value={formValues.startTime}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  name="endTime"
                  placeholder="09:00"
                  required
                  value={formValues.endTime}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, endTime: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving..." : editingPeriodNo ? "Update Period" : "Save Period"}
                </Button>
                {editingPeriodNo && (
                  <Button type="button" size="sm" variant="outline" onClick={clearForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            {success && <p className="mt-2 text-sm text-success">{success}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configured Periods ({periods.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {periods.length === 0 ? (
              <p className="text-sm text-text-2">No periods configured yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.periodNo}>
                      <TableCell>P{p.periodNo}</TableCell>
                      <TableCell>{p.startTime}</TableCell>
                      <TableCell>{p.endTime}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadPeriodForEdit(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={async () => {
                            setError(null);
                            try {
                              await deletePeriodTimingAction(p.periodNo);
                              if (editingPeriodNo === p.periodNo) clearForm();
                              await refresh();
                            } catch (err) {
                              setError(
                                err instanceof Error ? err.message : "Failed to remove period",
                              );
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
