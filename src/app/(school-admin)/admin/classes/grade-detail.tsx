"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createSectionAction,
  createSubjectAction,
  deleteSectionAction,
  deleteSubjectAction,
  updateSectionAction,
  updateSubjectAction,
} from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  periodsPerWeek: number;
}

export function GradeDetail({
  gradeId,
  gradeName,
  sections,
  subjects,
}: {
  gradeId: string;
  gradeName: string;
  sections: SectionRow[];
  subjects: SubjectRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [subjectSaved, setSubjectSaved] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "", periodsPerWeek: "5" });

  async function refresh() {
    router.refresh();
  }

  async function handleAddSubject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubjectSaved(false);
    setSubjectLoading(true);

    try {
      await createSubjectAction({
        gradeId,
        name: newSubject.name.trim(),
        code: newSubject.code.trim() || undefined,
        periodsPerWeek: Number(newSubject.periodsPerWeek) || 5,
      });
      setSubjectSaved(true);
      setNewSubject({ name: "", code: "", periodsPerWeek: "5" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add subject");
    } finally {
      setSubjectLoading(false);
    }
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

      <Card>
        <CardHeader>
          <CardTitle>Subjects for {gradeName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-2">
            Add subjects taught in this grade. Each section will assign teachers to these subjects.
          </p>
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={handleAddSubject}>
            <div>
              <Label>Name</Label>
              <Input
                name="name"
                placeholder="Mathematics"
                required
                value={newSubject.name}
                onChange={(e) => setNewSubject((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                name="code"
                placeholder="MATH"
                value={newSubject.code}
                onChange={(e) => setNewSubject((s) => ({ ...s, code: e.target.value }))}
              />
            </div>
            <div>
              <Label>Periods/Week</Label>
              <Input
                name="periodsPerWeek"
                type="number"
                min={1}
                required
                value={newSubject.periodsPerWeek}
                onChange={(e) => setNewSubject((s) => ({ ...s, periodsPerWeek: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={subjectLoading}>
                {subjectLoading ? "Adding..." : "Add Subject"}
              </Button>
            </div>
          </form>
          {subjectSaved && <p className="text-sm text-success">Subject added</p>}
          {subjects.length === 0 ? (
            <p className="text-sm text-text-2">No subjects yet. Add subjects for this grade.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Periods/Week</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <SubjectRowEditor
                    key={subject.id}
                    subject={subject}
                    onError={setError}
                    onSaved={refresh}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Sections</h2>
        <AddSectionDialog gradeId={gradeId} onSaved={refresh} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {sections.length === 0 ? (
            <p className="text-sm text-text-2">
              No sections yet. Add a section, then assign teachers per subject.
            </p>
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
    </div>
  );
}

function SubjectRowEditor({
  subject,
  onError,
  onSaved,
}: {
  subject: SubjectRow;
  onError: (msg: string | null) => void;
  onSaved: () => Promise<void>;
}) {
  const formId = `subject-${subject.id}`;

  return (
    <TableRow>
      <TableCell>
        <Input form={formId} name="name" defaultValue={subject.name} required />
      </TableCell>
      <TableCell>
        <Input form={formId} name="code" defaultValue={subject.code ?? ""} />
      </TableCell>
      <TableCell>
        <Input
          form={formId}
          name="periodsPerWeek"
          type="number"
          min={1}
          defaultValue={subject.periodsPerWeek}
          className="w-24"
        />
      </TableCell>
      <TableCell className="text-right space-x-1">
        <form
          id={formId}
          className="inline"
          onSubmit={async (e) => {
            e.preventDefault();
            onError(null);
            const fd = new FormData(e.currentTarget);
            try {
              await updateSubjectAction(subject.id, {
                name: fd.get("name") as string,
                code: (fd.get("code") as string) || undefined,
                periodsPerWeek: Number(fd.get("periodsPerWeek")) || subject.periodsPerWeek,
              });
              await onSaved();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to update subject");
            }
          }}
        >
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger"
          onClick={async () => {
            onError(null);
            try {
              await deleteSubjectAction(subject.id);
              await onSaved();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Failed to delete subject");
            }
          }}
        >
          Delete
        </Button>
      </TableCell>
    </TableRow>
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
