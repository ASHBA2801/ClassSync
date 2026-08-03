import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { GlobalUserSearch } from "./user-search";
import { systemAdminNav } from "@/lib/nav-config";

export default async function GlobalUsersPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  return (
    <PortalShell title="Global User Search" navItems={systemAdminNav} userName={ctx.name}>
      <GlobalUserSearch />
    </PortalShell>
  );
}
