"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCorePricingPlanAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CorePlanForm({
  plan,
}: {
  plan?: {
    id: string;
    name: string;
    description: string | null;
    maxUsers: number;
    priceAmount: string;
    isActive: boolean;
    sortOrder: number;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDone(false);
    const fd = new FormData(e.currentTarget);
    try {
      await saveCorePricingPlanAction({
        id: plan?.id,
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? "") || undefined,
        maxUsers: Number(fd.get("maxUsers")),
        priceAmount: Number(fd.get("priceAmount")),
        isActive: fd.get("isActive") === "on",
        sortOrder: Number(fd.get("sortOrder") || fd.get("maxUsers")),
      });
      setDone(true);
      if (!plan) (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>Plan name</Label>
        <Input name="name" defaultValue={plan?.name} placeholder="50 Users" required />
      </div>
      <div>
        <Label>Max login users</Label>
        <Input name="maxUsers" type="number" min={1} defaultValue={plan?.maxUsers ?? 50} required />
      </div>
      <div>
        <Label>Yearly price (INR)</Label>
        <Input
          name="priceAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={plan?.priceAmount ?? "24999"}
          required
        />
      </div>
      <div>
        <Label>Description</Label>
        <Input
          name="description"
          defaultValue={plan?.description ?? ""}
          placeholder="Core module for up to 50 users"
        />
      </div>
      <div>
        <Label>Sort order</Label>
        <Input name="sortOrder" type="number" defaultValue={plan?.sortOrder ?? 1} />
      </div>
      <label className="flex items-center gap-2 text-sm text-text-1">
        <input name="isActive" type="checkbox" defaultChecked={plan?.isActive ?? true} />
        Active (visible to school admins)
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {done ? <p className="text-sm text-success">Plan saved</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : plan ? "Update plan" : "Add plan"}
      </Button>
    </form>
  );
}
