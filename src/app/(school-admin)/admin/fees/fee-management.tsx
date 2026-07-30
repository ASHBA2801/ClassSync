"use client";

import { useState } from "react";
import { createFeeStructureAction, postFeeInvoicesAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Structure {
  id: string;
  name: string;
  amount: { toString(): string };
  _count: { feeInvoices: number };
}

export function FeeManagement({ structures }: { structures: Structure[] }) {
  const [done, setDone] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Create Fee Structure</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await createFeeStructureAction({
                name: fd.get("name") as string,
                amount: Number(fd.get("amount")),
              });
              setDone(true);
            }}
            className="space-y-3"
          >
            <div><Label>Name</Label><Input name="name" required /></div>
            <div><Label>Amount (₹)</Label><Input name="amount" type="number" required /></div>
            {done && <p className="text-sm text-green-600">Created</p>}
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Fee Structures</CardTitle></CardHeader>
        <CardContent>
          {structures.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b py-2 text-sm">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-zinc-500">₹{s.amount.toString()} · {s._count.feeInvoices} invoices</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await postFeeInvoicesAction(s.id);
                }}
              >
                Post Invoices
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
