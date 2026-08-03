import { redirect } from "next/navigation";
import { getActiveSessionAction } from "@/actions/account";
import { formatRoleLabel } from "@/lib/nav-config";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorSmartphone } from "lucide-react";

export default async function SessionsPage() {
  const session = await getActiveSessionAction();
  if (!session) redirect("/login");

  const signedInLabel = new Date(session.signedInAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>
          Devices and browsers where you are currently signed in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="glass-nested flex items-start gap-3 p-4">
          <div className="icon-ring h-10 w-10 shrink-0">
            <MonitorSmartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-1">This device</p>
              <Badge variant="success">Current session</Badge>
            </div>
            <p className="mt-1 text-sm text-text-2">{session.email}</p>
            <p className="text-xs text-text-3">
              {formatRoleLabel(session.role)} · Active now · Signed in {signedInLabel}
            </p>
          </div>
        </div>

        <p className="text-xs text-text-3">
          ClassSync uses secure token-based sessions. Sign out from the profile menu to end
          this session on this device.
        </p>
      </CardContent>
    </Card>
  );
}
