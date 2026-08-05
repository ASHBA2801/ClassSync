"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteScheduleConstraintAction,
  upsertScheduleConstraintAction,
} from "@/actions/scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEffectiveConstraint } from "@/lib/scheduler/readiness";
import type { ScheduleReadiness } from "@/lib/scheduler/readiness";

interface ConstraintRow {
  id: string;
  teacherId: string | null;
  minFreePerWeek: number;
  maxFreePerWeek: number;
}

interface TeacherRow {
  id: string;
  name: string;
}

interface SectionRow {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
  subjects: Array<{ id: string; name: string }>;
  assignments: Array<{ subjectId: string; teacher: { id: string; name: string } }>;
}

function formatMinFree(min: number): string {
  return min <= 0 ? "Off" : String(min);
}

export function TeachersStep({
  readiness,
  constraints,
  teachers,
  sections,
}: {
  readiness: ScheduleReadiness;
  constraints: ConstraintRow[];
  teachers: TeacherRow[];
  sections: SectionRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const globalConstraint = constraints.find((c) => c.teacherId === null);
  const teacherOverrides = constraints.filter((c) => c.teacherId !== null);

  const [requireMinFree, setRequireMinFree] = useState(
    (globalConstraint?.minFreePerWeek ?? 1) > 0,
  );
  const [minFreePerWeek, setMinFreePerWeek] = useState(
    String(Math.max(globalConstraint?.minFreePerWeek ?? 1, 1)),
  );
  const [maxFreePerWeek, setMaxFreePerWeek] = useState(
    String(globalConstraint?.maxFreePerWeek ?? 10),
  );

  const [overrideForm, setOverrideForm] = useState({
    teacherId: "",
    requireMinFree: true,
    minFreePerWeek: "1",
    maxFreePerWeek: "10",
  });

  const assignmentsCheck = readiness.checks.find((c) => c.step === "assignments");
  const constraintsCheck = readiness.checks.find((c) => c.step === "constraints");

  const assignedTeacherIds = new Set(
    sections.flatMap((s) => s.assignments.map((a) => a.teacher.id)),
  );

  async function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Teachers & Free-Time Rules</h2>
        <p className="text-sm text-text-2 mt-1">
          Assign teachers to every subject-section pair and configure weekly free-period limits.
          Teachers get at least 1 free hour per week by default — turn that off or change it below.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={assignmentsCheck?.passed ? "success" : "outline"}>
          {assignmentsCheck?.message ?? "Assignments pending"}
        </Badge>
        <Badge variant={constraintsCheck?.passed ? "success" : "outline"}>
          {constraintsCheck?.message ?? "Constraints pending"}
        </Badge>
      </div>

      {readiness.summary.unassignedSlots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-danger">Missing Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {readiness.summary.unassignedSlots.map((slot) => (
                <li key={`${slot.sectionId}-${slot.subjectId}`}>
                  {slot.sectionName} — {slot.subjectName}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Section Teacher Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-sm text-text-2">Configure sections first.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Subjects & Teachers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>
                      {section.subjects.length === 0 ? (
                        <span className="text-text-2 text-sm">No subjects for grade</span>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {section.subjects.map((subject) => {
                            const assignment = section.assignments.find(
                              (a) => a.subjectId === subject.id,
                            );
                            return (
                              <li key={subject.id}>
                                {subject.name}:{" "}
                                {assignment ? (
                                  <span className="text-success">{assignment.teacher.name}</span>
                                ) : (
                                  <span className="text-danger">Unassigned</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/admin/classes/${section.gradeId}/sections/${section.id}?from=schedule-setup`}
                        >
                          Assign
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Global Free-Period Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setSaved(false);
                try {
                  await upsertScheduleConstraintAction({
                    minFreePerWeek: requireMinFree ? Number(minFreePerWeek) : 0,
                    maxFreePerWeek: Number(maxFreePerWeek),
                  });
                  setSaved(true);
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to save constraints");
                }
              }}
              className="space-y-4"
            >
              <div>
                <Label>Max Free / Week</Label>
                <Input
                  type="number"
                  min={0}
                  value={maxFreePerWeek}
                  onChange={(e) => setMaxFreePerWeek(e.target.value)}
                  required
                />
                <p className="text-xs text-text-2 mt-1">
                  Upper limit on free periods a teacher may have each week.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div>
                  <Label htmlFor="require-min-free">Require minimum free hours</Label>
                  <p className="text-xs text-text-2 mt-0.5">
                    Defaults to at least 1 free hour per week.
                  </p>
                </div>
                <Switch
                  id="require-min-free"
                  checked={requireMinFree}
                  onCheckedChange={setRequireMinFree}
                />
              </div>

              {requireMinFree && (
                <div>
                  <Label>Min Free / Week</Label>
                  <Input
                    type="number"
                    min={1}
                    value={minFreePerWeek}
                    onChange={(e) => setMinFreePerWeek(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button type="submit" size="sm">
                Save Global Rules
              </Button>
              {saved && <p className="text-sm text-success">Global rules saved</p>}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Teacher Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                if (!overrideForm.teacherId) {
                  setError("Select a teacher");
                  return;
                }
                try {
                  await upsertScheduleConstraintAction({
                    teacherId: overrideForm.teacherId,
                    minFreePerWeek: overrideForm.requireMinFree
                      ? Number(overrideForm.minFreePerWeek)
                      : 0,
                    maxFreePerWeek: Number(overrideForm.maxFreePerWeek),
                  });
                  setOverrideForm({
                    teacherId: "",
                    requireMinFree: true,
                    minFreePerWeek: "1",
                    maxFreePerWeek: "10",
                  });
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to save override");
                }
              }}
              className="space-y-3"
            >
              <div>
                <Label>Teacher</Label>
                <Select
                  value={overrideForm.teacherId || undefined}
                  onValueChange={(value) =>
                    setOverrideForm((prev) => ({ ...prev, teacherId: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Free / Week</Label>
                <Input
                  type="number"
                  min={0}
                  value={overrideForm.maxFreePerWeek}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({ ...prev, maxFreePerWeek: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <Label htmlFor="override-require-min">Require minimum free hours</Label>
                <Switch
                  id="override-require-min"
                  checked={overrideForm.requireMinFree}
                  onCheckedChange={(checked) =>
                    setOverrideForm((prev) => ({ ...prev, requireMinFree: checked }))
                  }
                />
              </div>

              {overrideForm.requireMinFree && (
                <div>
                  <Label>Min Free / Week</Label>
                  <Input
                    type="number"
                    min={1}
                    value={overrideForm.minFreePerWeek}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({ ...prev, minFreePerWeek: e.target.value }))
                    }
                  />
                </div>
              )}

              <Button type="submit" size="sm" variant="outline">
                Add Override
              </Button>
            </form>

            {teacherOverrides.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Active Overrides</p>
                {teacherOverrides.map((override) => {
                  const teacher = teachers.find((t) => t.id === override.teacherId);
                  return (
                    <div
                      key={override.id}
                      className="flex items-center justify-between text-sm border rounded-lg px-3 py-2"
                    >
                      <span>
                        {teacher?.name ?? override.teacherId}: min{" "}
                        {formatMinFree(override.minFreePerWeek)}, max {override.maxFreePerWeek}
                        /week
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={async () => {
                          await deleteScheduleConstraintAction(override.id);
                          await refresh();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {assignedTeacherIds.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Effective Rules per Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Min Free / Week</TableHead>
                  <TableHead>Max Free / Week</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...assignedTeacherIds].map((teacherId) => {
                  const teacher = teachers.find((t) => t.id === teacherId);
                  const effective = getEffectiveConstraint(teacherId, constraints);
                  const hasOverride = teacherOverrides.some((o) => o.teacherId === teacherId);
                  return (
                    <TableRow key={teacherId}>
                      <TableCell>{teacher?.name ?? teacherId}</TableCell>
                      <TableCell>
                        {effective ? formatMinFree(effective.minFreePerWeek) : "—"}
                      </TableCell>
                      <TableCell>{effective?.maxFreePerWeek ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={hasOverride ? "default" : "outline"}>
                          {hasOverride ? "Override" : "Global"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button variant="outline" asChild>
        <Link href="/admin/teachers">Manage Teachers</Link>
      </Button>
    </div>
  );
}
