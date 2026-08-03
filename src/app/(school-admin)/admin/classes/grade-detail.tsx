"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createSectionAction,
  deleteSectionAction,
  setGradeSubjectsAction,
  updateSectionAction,
} from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormCheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SectionRow {
  id: string;
  name: string;
  section: string;
  _count: { students: number };
}

interface GradeSubjectRow {
  subjectId: string;
  periodsPerWeek: number;
  subject: { id: string; name: string };
}

interface SubjectRow {
  id: string;
  name: string;
  periodsPerWeek: number;
}

export function GradeDetail({
  gradeId,
  gradeName,
  sections,
  gradeSubjects,
  allSubjects,
}: {
  gradeId: string;
  gradeName: string;
  sections: SectionRow[];
  gradeSubjects: GradeSubjectRow[];
  allSubjects: SubjectRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [curriculumSaved, setCurriculumSaved] = useState(false);

  const selectedSubjectIds = new Set(gradeSubjects.map((gs) => gs.subjectId));

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
        <span>{gradeName}</span>
      </nav>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Sections</h2>
        <AddSectionDialog gradeId={gradeId} onSaved={refresh} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {sections.length === 0 ? (
            <p className="text-sm text-text-2">No sections yet. Add a section to this grade.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell>
                      <Link
                        href={`/admin/classes/${gradeId}/sections/${section.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        Section {section.section}
                      </Link>
                    </TableCell>
                    <TableCell>{section._count.students}</TableCell>
                    <TableCell className="text-right">
                      <EditSectionDialog section={section} onSaved={refresh} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={async () => {
                          try {
                            setError(null);
                            await deleteSectionAction(section.id);
                            await refresh();
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Failed to delete section");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grade Curriculum</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-text-2">
            Select subjects taught in this grade and set default periods per week.
          </p>
          {allSubjects.length === 0 ? (
            <p className="text-sm text-text-2">
              Add subjects in the{" "}
              <Link href="/admin/classes" className="text-primary hover:underline">
                subject catalog
              </Link>{" "}
              first.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const subjects = allSubjects
                  .filter((s) => fd.get(`subject_${s.id}`) === "on")
                  .map((s) => ({
                    subjectId: s.id,
                    periodsPerWeek: Number(fd.get(`periods_${s.id}`)) || s.periodsPerWeek,
                  }));

                await setGradeSubjectsAction(gradeId, subjects);
                setCurriculumSaved(true);
                await refresh();
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Include</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Periods/Week</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSubjects.map((subject) => {
                    const existing = gradeSubjects.find((gs) => gs.subjectId === subject.id);
                    return (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <FormCheckbox
                            name={`subject_${subject.id}`}
                            defaultChecked={selectedSubjectIds.has(subject.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{subject.name}</TableCell>
                        <TableCell>
                          <Input
                            name={`periods_${subject.id}`}
                            type="number"
                            min={1}
                            defaultValue={existing?.periodsPerWeek ?? subject.periodsPerWeek}
                            className="w-24"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {curriculumSaved && (
                <p className="text-sm text-success">Curriculum saved</p>
              )}
              <Button type="submit">Save Curriculum</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddSectionDialog({
  gradeId,
  onSaved,
}: {
  gradeId: string;
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Section</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            await createSectionAction({
              gradeId,
              section: fd.get("section") as string,
            });
            setLoading(false);
            setOpen(false);
            await onSaved();
          }}
        >
          <div>
            <Label>Section Letter</Label>
            <Input name="section" placeholder="A" required />
          </div>
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSectionDialog({
  section,
  onSaved,
}: {
  section: { id: string; section: string };
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            await updateSectionAction(section.id, {
              section: fd.get("section") as string,
            });
            setLoading(false);
            setOpen(false);
            await onSaved();
          }}
        >
          <div>
            <Label>Section Letter</Label>
            <Input name="section" defaultValue={section.section} required />
          </div>
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
