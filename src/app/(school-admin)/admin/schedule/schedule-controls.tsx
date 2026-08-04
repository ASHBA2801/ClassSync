"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScheduleReadiness } from "@/lib/scheduler/readiness";

interface Period {
  periodNo: number;
  startTime: string;
  endTime: string;
}

export function ScheduleControls({
  periods,
  readiness,
}: {
  periods: Period[];
  readiness: ScheduleReadiness;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timetable Generation</CardTitle>
        </CardHeader>
        <CardContent>
          {readiness.isReady ? (
            <div className="space-y-2">
              <Badge variant="success">Setup complete</Badge>
              <p className="text-sm text-text-2">
                All prerequisites are configured. Generate or regenerate from the setup wizard.
              </p>
              <Button asChild>
                <Link href="/admin/schedule/setup?step=5">Go to Setup Wizard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge variant="outline">Setup incomplete</Badge>
              <p className="text-sm text-text-2">
                Complete all timetable setup steps before generating a schedule.
              </p>
              <ul className="text-xs text-text-2 space-y-1">
                {readiness.checks
                  .filter((c) => !c.passed)
                  .slice(0, 3)
                  .map((c) => (
                    <li key={c.step}>• {c.message}</li>
                  ))}
              </ul>
              <Button asChild>
                <Link href="/admin/schedule/setup">Complete Timetable Setup</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Period Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-2">
            {periods.length} period(s) configured. Manage session times in the setup wizard.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/admin/schedule/setup?step=2">Configure Periods</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
