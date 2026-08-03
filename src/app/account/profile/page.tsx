import { redirect } from "next/navigation";
import { getAccountProfileAction } from "@/actions/account";
import { formatRoleLabel } from "@/lib/nav-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getAccountProfileAction();
  if (!profile) redirect("/login");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          initialName={profile.name}
          initialPhone={profile.phone}
          email={profile.email}
          roleLabel={formatRoleLabel(profile.role)}
        />
      </CardContent>
    </Card>
  );
}
