import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScheduleReadiness } from "@/lib/scheduler/readiness";

export function GradesStep({
  readiness,
  grades,
}: {
  readiness: ScheduleReadiness;
  grades: Array<{
    id: string;
    name: string;
    classSections: Array<{ id: string; name: string }>;
  }>;
}) {
  const gradesCheck = readiness.checks.find((c) => c.step === "grades");
  const sectionsCheck = readiness.checks.find((c) => c.step === "sections");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Grades & Sections</h2>
        <p className="text-sm text-text-2 mt-1">
          Create all grades and at least one section per grade before proceeding.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={gradesCheck?.passed ? "success" : "outline"}>
          {gradesCheck?.message ?? "Grades pending"}
        </Badge>
        <Badge variant={sectionsCheck?.passed ? "success" : "outline"}>
          {sectionsCheck?.message ?? "Sections pending"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-sm text-text-2">No grades configured yet.</p>
          ) : (
            <ul className="space-y-3">
              {grades.map((grade) => (
                <li key={grade.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{grade.name}</p>
                    <p className="text-sm text-text-2">
                      {grade.classSections.length} section(s)
                      {grade.classSections.length > 0 &&
                        `: ${grade.classSections.map((s) => s.name).join(", ")}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/classes/${grade.id}`}>Manage</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild>
        <Link href="/admin/classes">Go to Classes</Link>
      </Button>
    </div>
  );
}
