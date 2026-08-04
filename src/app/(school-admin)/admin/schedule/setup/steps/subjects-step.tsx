import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export function SubjectsStep({
  readiness,
  grades,
}: {
  readiness: ScheduleReadiness;
  grades: Array<{
    id: string;
    name: string;
    subjects: Array<{
      id: string;
      name: string;
      periodsPerWeek: number;
    }>;
  }>;
}) {
  const subjectsCheck = readiness.checks.find((c) => c.step === "subjects");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Subject Configuration</h2>
        <p className="text-sm text-text-2 mt-1">
          Each grade has its own subjects. Add subjects on the grade page, then assign teachers per section.
        </p>
      </div>

      <Badge variant={subjectsCheck?.passed ? "success" : "outline"}>
        {subjectsCheck?.message ?? "Subjects not configured"}
      </Badge>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subjects by Grade</CardTitle>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-sm text-text-2">Configure grades first.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.name}</TableCell>
                    <TableCell>
                      {grade.subjects.length === 0 ? (
                        <span className="text-text-2 text-sm">No subjects added</span>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {grade.subjects.map((s) => (
                            <li key={s.id}>
                              {s.name}{" "}
                              <span className="text-text-2">({s.periodsPerWeek}/wk)</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/classes/${grade.id}`}>Manage Subjects</Link>
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
  );
}
