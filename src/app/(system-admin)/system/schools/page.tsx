import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolsAction } from "@/actions/system-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OnboardSchoolForm } from "./onboard-form";
import { systemAdminNav } from "@/lib/nav-config";

export default async function SchoolsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const schools = await listSchoolsAction();

  return (
    <PortalShell title="School Management" navItems={systemAdminNav} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Onboard New School</CardTitle></CardHeader>
          <CardContent><OnboardSchoolForm /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>All Schools ({schools.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Timezone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-text-2 font-mono">{s.id.slice(0, 8)}…</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "ACTIVE" ? "success" : "outline"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{s.planTier}</Badge></TableCell>
                    <TableCell className="text-text-2">{s.timezone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
