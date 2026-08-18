import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getSessionContext } from "@/lib/rbac/guard";
import { PasswordForm } from "./password-form";
import { PasswordContinue } from "./password-continue";

export default async function PasswordPage() {
  const [ctx, session] = await Promise.all([getSessionContext(), auth()]);
  const dbForced = ctx?.forcePasswordChange === true;
  const jwtForced = session?.user.forcePasswordChange === true;

  if (jwtForced && !dbForced) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password already updated</CardTitle>
          <CardDescription>
            Your new password is saved. Continue to the portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordContinue />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dbForced ? "Set a new password" : "Change password"}</CardTitle>
        <CardDescription>
          {dbForced
            ? "Choose a password to replace the temporary one. You will use this for all future logins."
            : "Use a strong password with at least 8 characters."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PasswordForm forced={dbForced} />
      </CardContent>
    </Card>
  );
}
