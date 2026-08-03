"use client";

import { useState } from "react";
import {
  generateScheduleAction,
  upsertPeriodTimingAction,
  upsertScheduleConstraintAction,
} from "@/actions/scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Period {
  periodNo: number;
  startTime: string;
  endTime: string;
}

export function ScheduleControls({ periods }: { periods: Period[] }) {
  const [queued, setQueued] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    await generateScheduleAction();
    setQueued(true);
    setLoading(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Generate Schedule</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Queuing..." : "Generate Timetable"}
          </Button>
          {queued && <p className="mt-2 text-sm text-success">Generation queued</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Add Period</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await upsertPeriodTimingAction({
                periodNo: Number(fd.get("periodNo")),
                startTime: fd.get("startTime") as string,
                endTime: fd.get("endTime") as string,
              });
            }}
            className="space-y-2"
          >
            <div><Label>Period #</Label><Input name="periodNo" type="number" required /></div>
            <div><Label>Start</Label><Input name="startTime" placeholder="08:00" required /></div>
            <div><Label>End</Label><Input name="endTime" placeholder="09:00" required /></div>
            <Button type="submit" size="sm">Save Period</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Free Period Constraints</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await upsertScheduleConstraintAction({
                minFreePeriods: Number(fd.get("minFreePeriods")),
                maxFreePeriods: Number(fd.get("maxFreePeriods")),
              });
            }}
            className="space-y-2"
          >
            <div><Label>Min Free Periods</Label><Input name="minFreePeriods" type="number" defaultValue={1} /></div>
            <div><Label>Max Free Periods</Label><Input name="maxFreePeriods" type="number" defaultValue={3} /></div>
            <Button type="submit" size="sm">Save Constraints</Button>
          </form>
          <p className="mt-2 text-xs text-text-2">{periods.length} periods configured</p>
        </CardContent>
      </Card>
    </div>
  );
}
