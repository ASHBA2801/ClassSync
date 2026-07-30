"use client";

import { useState } from "react";
import { onboardSchoolAction } from "@/actions/system-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardSchoolForm() {
  const [result, setResult] = useState<{ schoolId: string; slug: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    try {
      const res = await onboardSchoolAction({
        name: fd.get("name") as string,
        adminName: fd.get("adminName") as string,
        adminEmail: fd.get("adminEmail") as string,
        adminPassword: fd.get("adminPassword") as string,
        campusLat: Number(fd.get("campusLat")) || undefined,
        campusLng: Number(fd.get("campusLng")) || undefined,
        campusRadiusM: Number(fd.get("campusRadiusM")) || 200,
        timezone: (fd.get("timezone") as string) || "Asia/Kolkata",
        planTier: (fd.get("planTier") as "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE") || "BASIC",
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to onboard school");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>School Name</Label><Input name="name" required /></div>
      <div><Label>Admin Name</Label><Input name="adminName" required /></div>
      <div><Label>Admin Email</Label><Input name="adminEmail" type="email" required /></div>
      <div><Label>Admin Password</Label><Input name="adminPassword" type="password" required minLength={8} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Campus Lat</Label><Input name="campusLat" type="number" step="any" /></div>
        <div><Label>Campus Lng</Label><Input name="campusLng" type="number" step="any" /></div>
      </div>
      <div><Label>Geofence Radius (m)</Label><Input name="campusRadiusM" type="number" defaultValue={200} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-green-600">School created: {result.schoolId}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Onboard School"}</Button>
    </form>
  );
}
