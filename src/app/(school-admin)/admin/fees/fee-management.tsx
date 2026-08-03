"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFeeStructureAction, postFeeInvoicesAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";

interface GradeOption {
  id: string;
  name: string;
}

interface Structure {
  id: string;
  name: string;
  amount: { toString(): string };
  grade: { name: string } | null;
  classSection: { name: string } | null;
  _count: { feeInvoices: number };
}

export function FeeManagement({
  structures,
  grades,
}: {
  structures: Structure[];
  grades: GradeOption[];
}) {
  const router = useRouter();
  const [gradeId, setGradeId] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create Fee Structure</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setDone(null);

              if (!gradeId) {
                setError("Please select a grade.");
                return;
              }

              const fd = new FormData(e.currentTarget);
              try {
                const result = await createFeeStructureAction({
                  name: fd.get("name") as string,
                  amount: Number(fd.get("amount")),
                  gradeId,
                  termStart: (fd.get("termStart") as string) || undefined,
                  termEnd: (fd.get("termEnd") as string) || undefined,
                });
                setDone(
                  result.invoiceCount > 0
                    ? `Created and posted ${result.invoiceCount} invoice(s)`
                    : "Created (no students in this grade yet)",
                );
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create fee structure");
              }
            }}
            className="space-y-3"
          >
            <div>
              <Label>Grade</Label>
              <Select value={gradeId || undefined} onValueChange={setGradeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input name="name" placeholder="Term 1 Fee" required /></div>
            <div><Label>Amount (₹)</Label><Input name="amount" type="number" required /></div>
            <div><Label>Term Start</Label><DatePicker name="termStart" /></div>
            <div><Label>Term End</Label><DatePicker name="termEnd" /></div>
            {done && <p className="text-sm text-success">{done}</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit">Create & Post Invoices</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fee Structures</CardTitle></CardHeader>
        <CardContent>
          {structures.length === 0 ? (
            <p className="text-sm text-text-2">No fee structures yet.</p>
          ) : (
            structures.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border-subtle py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-text-1">{s.name}</p>
                  <p className="text-text-2">
                    ₹{s.amount.toString()} · {s._count.feeInvoices} invoices
                    {s.grade && ` · ${s.grade.name}`}
                    {s.classSection && ` · ${s.classSection.name}`}
                    {!s.grade && !s.classSection && " · School-wide"}
                  </p>
                </div>
                {!s.grade && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await postFeeInvoicesAction(s.id);
                      router.refresh();
                    }}
                  >
                    Post Invoices
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
