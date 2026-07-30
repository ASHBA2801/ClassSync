"use client";

import { useState } from "react";
import { createSchoolUserAction } from "@/actions/school-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateUserForm({ role }: { role: "TEACHER" | "PARENT" | "SCHOOL_ADMIN" }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await createSchoolUserAction({
        email: fd.get("email") as string,
        name: fd.get("name") as string,
        password: fd.get("password") as string,
        role,
        phone: (fd.get("phone") as string) || undefined,
      });
      setDone(true);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Name</Label><Input name="name" required /></div>
      <div><Label>Email</Label><Input name="email" type="email" required /></div>
      <div><Label>Password</Label><Input name="password" type="password" required minLength={8} /></div>
      <div><Label>Phone</Label><Input name="phone" /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-green-600">User created</p>}
      <Button type="submit" disabled={loading}>Create {role.toLowerCase().replace("_", " ")}</Button>
    </form>
  );
}
