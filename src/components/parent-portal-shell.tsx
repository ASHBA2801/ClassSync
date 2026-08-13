import { ChildSwitcher } from "@/components/child-switcher";
import { PortalShell } from "@/components/portal-shell";
import type { NavItem } from "@/lib/nav-config";

interface ParentPortalShellProps {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
  userName?: string;
}

export function ParentPortalShell({
  title,
  navItems,
  children,
  userName,
}: ParentPortalShellProps) {
  return (
    <PortalShell
      title={title}
      navItems={navItems}
      userName={userName}
      headerExtra={<ChildSwitcher />}
    >
      {children}
    </PortalShell>
  );
}
