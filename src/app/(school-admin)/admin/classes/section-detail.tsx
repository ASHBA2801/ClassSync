"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteTeacherAssignmentAction,
  upsertTeacherAssignmentAction,
} from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface GradeSubjectRow {
  subjectId: string;
  periodsPerWeek: number;
  subject: { id: string; name: string };
}

interface AssignmentRow {
  subjectId: string;
  teacherId: string;
  periodsPerWeek: number | null;
  teacher: { id: string; name: string };
  subject: { id: string; name: string };
}

interface TeacherRow {
  user: { id: string; name: string };
}

export function SectionDetail({
  gradeId,
  gradeName,
  sectionId,
  sectionLabel,
  gradeSubjects,
  assignments,
  teachers,
}: {
  gradeId: string;
  gradeName: string;
  sectionId: string;
  sectionLabel: string;
  gradeSubjects: GradeSubjectRow[];
  assignments: AssignmentRow[];
  teachers: TeacherRow[];
}) {
  const router = useRouter();
  const [savedSubjectId, setSavedSubjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teacherIds, setTeacherIds] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const a of assignments) initial[a.subjectId] = a.teacherId;
    return initial;
  });

  const assignmentBySubject = new Map(
    assignments.map((a) => [a.subjectId, a]),
  );

  async function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <nav className="text-sm text-text-2">
        <Link href="/admin/classes" className="text-primary hover:underline">
          Classes
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/admin/classes/${gradeId}`} className="text-primary hover:underline">
          {gradeName}
        </Link>
        <span className="mx-2">/</span>
        <span>Section {sectionLabel}</span>
      </nav>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Teacher Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {gradeSubjects.length === 0 ? (
            <p className="text-sm text-text-2">
              Add subjects for this grade on the{" "}
              <Link href={`/admin/classes/${gradeId}`} className="text-primary hover:underline">
                grade page
              </Link>{" "}
              first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Periods/Week</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradeSubjects.map((gs) => {
                  const assignment = assignmentBySubject.get(gs.subjectId);
                  const formId = `assignment-${gs.subjectId}`;
                  return (
                    <TableRow key={gs.subjectId}>
                      <TableCell className="font-medium">{gs.subject.name}</TableCell>
                      <TableCell>
                        <Input
                          form={formId}
                          name="periodsPerWeek"
                          type="number"
                          min={1}
                          defaultValue={
                            assignment?.periodsPerWeek ?? gs.periodsPerWeek
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={teacherIds[gs.subjectId] || undefined}
                          onValueChange={(value) =>
                            setTeacherIds((prev) => ({ ...prev, [gs.subjectId]: value }))
                          }
                        >
                          <SelectTrigger className="min-w-[160px]">
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((t) => (
                              <SelectItem key={t.user.id} value={t.user.id}>
                                {t.user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <form
                          id={formId}
                          className="inline"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setError(null);
                            const fd = new FormData(e.currentTarget);
                            const teacherId = teacherIds[gs.subjectId];
                            if (!teacherId) {
                              setError("Select a teacher before saving");
                              return;
                            }
                            await upsertTeacherAssignmentAction({
                              teacherId,
                              classSectionId: sectionId,
                              subjectId: gs.subjectId,
                              periodsPerWeek: Number(fd.get("periodsPerWeek")) || gs.periodsPerWeek,
                            });
                            setSavedSubjectId(gs.subjectId);
                            await refresh();
                          }}
                        >
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </form>
                        {assignment && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger"
                            onClick={async () => {
                              setError(null);
                              await deleteTeacherAssignmentAction(sectionId, gs.subjectId);
                              setTeacherIds((prev) => {
                                const next = { ...prev };
                                delete next[gs.subjectId];
                                return next;
                              });
                              await refresh();
                            }}
                          >
                            Remove
                          </Button>
                        )}
                        {savedSubjectId === gs.subjectId && (
                          <p className="mt-1 text-xs text-success">Saved</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-text-2">
            Periods per week are used by the smart scheduler when generating timetables.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
