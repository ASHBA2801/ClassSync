import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listSchoolsAction } from "@/actions/system-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardSchoolForm } from "./onboard-form";

const navItems = [
  { href: "/system", label: "Dashboard" },
  { href: "/system/schools", label: "Schools" },
  { href: "/system/users", label: "Global Users" },
  { href: "/system/ai-keys", label: "AI Keys" },
  { href: "/system/monitoring", label: "Monitoring" },
];

export default async function SchoolsPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const schools = await listSchoolsAction();

  return (
    <PortalShell title="School Management" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Onboard New School</CardTitle></CardHeader>
          <CardContent><OnboardSchoolForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>All Schools ({schools.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schools.map((s) => (
                <div key={s.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-zinc-500">ID: {s.id}</p>
                  <p className="text-zinc-500">{s.status} · {s.planTier} · {s.timezone}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
