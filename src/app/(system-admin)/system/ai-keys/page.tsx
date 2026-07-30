import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { listAIServiceKeysAction } from "@/actions/monitoring";
import { AIKeyForm } from "./ai-key-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const navItems = [
  { href: "/system", label: "Dashboard" },
  { href: "/system/schools", label: "Schools" },
  { href: "/system/users", label: "Global Users" },
  { href: "/system/ai-keys", label: "AI Keys" },
  { href: "/system/monitoring", label: "Monitoring" },
];

export default async function AIKeysPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  const keys = await listAIServiceKeysAction();

  return (
    <PortalShell title="AI Service Keys" navItems={navItems} userName={ctx.name}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add Key</CardTitle></CardHeader>
          <CardContent><AIKeyForm /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active Keys</CardTitle></CardHeader>
          <CardContent>
            {keys.map((k) => (
              <div key={k.id} className="border-b py-2 text-sm">
                <p className="font-medium">{k.provider}</p>
                <p className="text-zinc-500">{k.school?.name ?? "Platform default"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PortalShell>
  );
}
