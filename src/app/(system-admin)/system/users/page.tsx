import { PortalShell } from "@/components/portal-shell";
import { getSessionContext } from "@/lib/rbac/guard";
import { redirect } from "next/navigation";
import { GlobalUserSearch } from "./user-search";

const navItems = [
  { href: "/system", label: "Dashboard" },
  { href: "/system/schools", label: "Schools" },
  { href: "/system/users", label: "Global Users" },
  { href: "/system/ai-keys", label: "AI Keys" },
  { href: "/system/monitoring", label: "Monitoring" },
];

export default async function GlobalUsersPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.role !== "SYSTEM_ADMIN") redirect("/login");

  return (
    <PortalShell title="Global User Search" navItems={navItems} userName={ctx.name}>
      <GlobalUserSearch />
    </PortalShell>
  );
}
