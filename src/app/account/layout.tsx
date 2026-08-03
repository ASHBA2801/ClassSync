import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { getNavForRole } from "@/lib/nav-config";
import { getSessionContext } from "@/lib/rbac/guard";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return (
    <PortalShell title="Account" navItems={getNavForRole(ctx.role)} userName={ctx.name}>
      <div className="mx-auto max-w-2xl">{children}</div>
    </PortalShell>
  );
}
