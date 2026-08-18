"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { changePasswordAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

export function PasswordForm({ forced = false }: { forced?: boolean }) {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function continueAfterChange() {
    await update({ forcePasswordChange: false });
    router.replace("/select-context");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setMessage(null);

    const formData = new FormData(form);
    const currentPassword = (formData.get("currentPassword") as string | null) ?? "";
    const newPassword = (formData.get("newPassword") as string).trim();
    const confirmPassword = (formData.get("confirmPassword") as string).trim();

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    const result = await changePasswordAction({
      currentPassword: forced ? undefined : currentPassword,
      newPassword,
      forced,
    });

    if (result.error) {
      setLoading(false);
      setMessage({ type: "error", text: result.error });
      return;
    }

    form.reset();
    setMessage({ type: "success", text: "Password changed successfully." });

    if (forced) {
      await continueAfterChange();
      return;
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!forced && (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <PasswordInput id="currentPassword" name="currentPassword" required />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={8}
        />
      </div>

      {message && (
        <p
          className={
            message.type === "success"
              ? "text-sm text-success"
              : "text-sm text-danger"
          }
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Updating…" : forced ? "Set new password" : "Update password"}
      </Button>
    </form>
  );
}
