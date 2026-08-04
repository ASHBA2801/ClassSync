"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateScheduleAction } from "@/actions/scheduler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ScheduleReadiness } from "@/lib/scheduler/readiness";

type GenerateResult =
  | { success: true; versionId: string; slotCount: number }
  | { success: false; error: string; checks?: Array<{ message: string; fixHref?: string }>; errors?: string[] };

export function ReviewStep({ readiness }: { readiness: ScheduleReadiness }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    const response = await generateScheduleAction();
    setResult(response);
    setLoading(false);
    if (response.success) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Generate</h2>
        <p className="text-sm text-text-2 mt-1">
          Verify all setup steps are complete, then generate the timetable. Generation runs
          immediately and results appear on the Schedule page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {readiness.checks.map((check) => (
              <li key={check.step} className="flex items-start gap-2 text-sm">
                {check.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={check.passed ? "text-text-1" : "text-danger"}>
                    {check.message}
                  </span>
                  {!check.passed && check.fixHref && (
                    <Link
                      href={check.fixHref}
                      className="block text-primary text-xs hover:underline mt-0.5"
                    >
                      Fix this →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-text-2">Grades</dt>
              <dd className="font-medium text-lg">{readiness.summary.gradeCount}</dd>
            </div>
            <div>
              <dt className="text-text-2">Sections</dt>
              <dd className="font-medium text-lg">{readiness.summary.sectionCount}</dd>
            </div>
            <div>
              <dt className="text-text-2">Periods/Day</dt>
              <dd className="font-medium text-lg">{readiness.summary.periodCount}</dd>
            </div>
            <div>
              <dt className="text-text-2">Unassigned</dt>
              <dd className="font-medium text-lg">{readiness.summary.unassignedSlots.length}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleGenerate} disabled={!readiness.isReady || loading}>
          {loading ? "Generating..." : "Generate Timetable"}
        </Button>
        {!readiness.isReady && (
          <Badge variant="outline">Complete all setup steps to enable generation</Badge>
        )}
      </div>

      {result?.success && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-success">
              Timetable generated successfully — {result.slotCount} slots created.{" "}
              <Link href="/admin/schedule" className="underline font-medium">
                View schedule →
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {result && !result.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-danger">
              {result.error === "Setup incomplete" ? "Setup Incomplete" : "Generation Failed"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 list-disc pl-5">
              {result.checks?.map((check, i) => (
                <li key={i}>{check.message}</li>
              ))}
              {result.errors?.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
