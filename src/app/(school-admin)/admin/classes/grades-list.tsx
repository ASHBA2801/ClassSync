"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createGradeAction,
  createSubjectAction,
  deleteGradeAction,
  updateGradeAction,
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

interface GradeRow {
  id: string;
  name: string;
  sortOrder: number;
  _count: { classSections: number; gradeSubjects: number };
  classSections: { _count: { students: number } }[];
}

interface SubjectRow {
  id: string;
  name: string;
  code: string | null;
  periodsPerWeek: number;
}

export function GradesList({
  grades,
  subjects,
}: {
  grades: GradeRow[];
  subjects: SubjectRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-2">
          Manage grades, then add sections and assign teachers per section.
        </p>
        <AddGradeDialog onSaved={refresh} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Grades ({grades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-sm text-text-2">No grades yet. Add your first grade to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Subjects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => {
                  const studentCount = grade.classSections.reduce(
                    (sum, s) => sum + s._count.students,
                    0,
                  );
                  return (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <Link
                          href={`/admin/classes/${grade.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {grade.name}
                        </Link>
                      </TableCell>
                      <TableCell>{grade._count.classSections}</TableCell>
                      <TableCell>{studentCount}</TableCell>
                      <TableCell>{grade._count.gradeSubjects}</TableCell>
                      <TableCell className="text-right">
                        <EditGradeDialog grade={grade} onSaved={refresh} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={async () => {
                            try {
                              setError(null);
                              await deleteGradeAction(grade.id);
                              await refresh();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Failed to delete grade");
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SubjectCatalog subjects={subjects} onSaved={refresh} />
    </div>
  );
}

function AddGradeDialog({ onSaved }: { onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Grade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Grade</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            await createGradeAction({
              name: fd.get("name") as string,
              sortOrder: Number(fd.get("sortOrder")) || 0,
            });
            setLoading(false);
            setOpen(false);
            await onSaved();
          }}
        >
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="Grade 10" required />
          </div>
          <div>
            <Label>Sort Order</Label>
            <Input name="sortOrder" type="number" defaultValue={0} />
          </div>
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditGradeDialog({
  grade,
  onSaved,
}: {
  grade: { id: string; name: string; sortOrder: number };
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
          <DialogTitle>Edit Grade</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            await updateGradeAction(grade.id, {
              name: fd.get("name") as string,
              sortOrder: Number(fd.get("sortOrder")) || 0,
            });
            setLoading(false);
            setOpen(false);
            await onSaved();
          }}
        >
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={grade.name} required />
          </div>
          <div>
            <Label>Sort Order</Label>
            <Input name="sortOrder" type="number" defaultValue={grade.sortOrder} />
          </div>
          <Button type="submit" disabled={loading}>
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubjectCatalog({
  subjects,
  onSaved,
}: {
  subjects: SubjectRow[];
  onSaved: () => Promise<void>;
}) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Catalog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            await createSubjectAction({
              name: fd.get("name") as string,
              code: (fd.get("code") as string) || undefined,
              periodsPerWeek: Number(fd.get("periodsPerWeek")) || 5,
            });
            setDone(true);
            setLoading(false);
            e.currentTarget.reset();
            await onSaved();
          }}
        >
          <div>
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>Code</Label>
            <Input name="code" />
          </div>
          <div>
            <Label>Default Periods/Week</Label>
            <Input name="periodsPerWeek" type="number" defaultValue={5} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>
              Add Subject
            </Button>
          </div>
        </form>
        {done && <p className="text-sm text-success">Subject added</p>}
        {subjects.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Default Periods/Week</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-text-2">{s.code ?? "—"}</TableCell>
                  <TableCell>{s.periodsPerWeek}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
