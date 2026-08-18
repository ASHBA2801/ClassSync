"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignCorePlanAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AssignPlanForm({
  schools,
  plans,
}: {
  schools: Array<{ schoolId: string; schoolName: string }>;
  plans: Array<{ id: string; name: string; maxUsers: number }>;
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(schools[0]?.schoolId ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !planId) return;
    setLoading(true);
    setError("");
    setDone(false);
    try {
      await assignCorePlanAction(schoolId, planId);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>School</Label>
        <Select value={schoolId || undefined} onValueChange={setSchoolId}>
          <SelectTrigger>
            <SelectValue placeholder="Select school" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.schoolId} value={s.schoolId}>
                {s.schoolName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Plan</Label>
        <Select value={planId || undefined} onValueChange={setPlanId}>
          <SelectTrigger>
            <SelectValue placeholder="Select plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.maxUsers} users)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {done ? <p className="text-sm text-success">Plan assigned for 1 year</p> : null}
      <Button type="submit" disabled={loading || !schoolId || !planId}>
        {loading ? "Assigning..." : "Assign without payment"}
      </Button>
    </form>
  );
}
