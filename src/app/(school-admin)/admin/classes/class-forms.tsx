"use client";

import { useState } from "react";
import {
  createClassSectionAction,
  createSubjectAction,
  createTeacherAssignmentAction,
} from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  teachers: { user: { id: string; name: string } }[];
}

export function ClassManagementForms({ classes, subjects, teachers }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SimpleForm title="Add Class" onSubmit={async (fd) => {
        await createClassSectionAction({
          name: fd.get("name") as string,
          grade: fd.get("grade") as string,
          section: fd.get("section") as string,
        });
      }}>
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>Grade</Label><Input name="grade" required /></div>
        <div><Label>Section</Label><Input name="section" required /></div>
      </SimpleForm>

      <SimpleForm title="Add Subject" onSubmit={async (fd) => {
        await createSubjectAction({
          name: fd.get("name") as string,
          code: (fd.get("code") as string) || undefined,
          periodsPerWeek: Number(fd.get("periodsPerWeek")) || 5,
        });
      }}>
        <div><Label>Name</Label><Input name="name" required /></div>
        <div><Label>Code</Label><Input name="code" /></div>
        <div><Label>Periods/Week</Label><Input name="periodsPerWeek" type="number" defaultValue={5} /></div>
      </SimpleForm>

      <SimpleForm title="Assign Teacher" onSubmit={async (fd) => {
        await createTeacherAssignmentAction({
          teacherId: fd.get("teacherId") as string,
          classSectionId: fd.get("classSectionId") as string,
          subjectId: fd.get("subjectId") as string,
        });
      }}>
        <div>
          <Label>Teacher</Label>
          <select name="teacherId" className="flex h-10 w-full rounded-md border px-3 text-sm" required>
            {teachers.map((t) => <option key={t.user.id} value={t.user.id}>{t.user.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Class</Label>
          <select name="classSectionId" className="flex h-10 w-full rounded-md border px-3 text-sm" required>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Subject</Label>
          <select name="subjectId" className="flex h-10 w-full rounded-md border px-3 text-sm" required>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </SimpleForm>
    </div>
  );
}

function SimpleForm({
  title,
  children,
  onSubmit,
}: {
  title: string;
  children: React.ReactNode;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await onSubmit(new FormData(e.currentTarget));
    setDone(true);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {children}
          {done && <p className="text-sm text-green-600">Saved</p>}
          <Button type="submit" size="sm" disabled={loading}>Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
