"use client";

import { useState } from "react";
import { saveAIServiceKeyAction } from "@/actions/monitoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function AIKeyForm() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await saveAIServiceKeyAction({
      provider: fd.get("provider") as string,
      key: fd.get("key") as string,
      schoolId: (fd.get("schoolId") as string) || undefined,
    });
    setSaved(true);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label>Provider</Label><Input name="provider" placeholder="aws-rekognition" required /></div>
      <div><Label>API Key</Label><PasswordInput name="key" required /></div>
      <div><Label>School ID (optional)</Label><Input name="schoolId" placeholder="Leave empty for platform default" /></div>
      {saved && <p className="text-sm text-success">Key saved</p>}
      <Button type="submit" disabled={loading}>Save Key</Button>
    </form>
  );
}
