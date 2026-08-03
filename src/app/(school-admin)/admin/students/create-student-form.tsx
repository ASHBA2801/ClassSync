"use client";

import { useState } from "react";
import { createStudentAction } from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

interface ClassOption {
  id: string;
  name: string;
  section: string;
  gradeRef: { id: string; name: string; sortOrder: number };
}

export function CreateStudentForm({ classes }: { classes: ClassOption[] }) {
  const [classSectionId, setClassSectionId] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const grouped = classes.reduce<Record<string, ClassOption[]>>((acc, c) => {
    const key = c.gradeRef.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const gradeGroups = Object.values(grouped).sort(
    (a, b) => a[0].gradeRef.sortOrder - b[0].gradeRef.sortOrder,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createStudentAction({
      name: fd.get("name") as string,
      classSectionId: classSectionId || undefined,
      admissionNo: (fd.get("admissionNo") as string) || undefined,
      dob: (fd.get("dob") as string) || undefined,
    });
    setDone(true);
    setLoading(false);
    setClassSectionId("");
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Admission No</Label><Input name="admissionNo" /></div>
      <div><Label>Date of Birth</Label><DatePicker name="dob" /></div>
      <div>
        <Label>Class Section</Label>
        <Select value={classSectionId || undefined} onValueChange={setClassSectionId}>
          <SelectTrigger>
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            {gradeGroups.map((sections) => (
              <SelectGroup key={sections[0].gradeRef.id}>
                <SelectLabel>{sections[0].gradeRef.name}</SelectLabel>
                {sections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    Section {c.section}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      {done && <p className="text-sm text-success">Student created</p>}
      <Button type="submit" disabled={loading}>Add Student</Button>
    </form>
  );
}
