"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronLeft } from "lucide-react";
import type { NavItem } from "@/lib/nav-config";
import { getNavIcon } from "@/components/nav-icons";
import { ProfileMenu } from "@/components/profile-menu";

interface PortalShellProps {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
  userName?: string;
}

export function PortalShell({ title, navItems, children, userName }: PortalShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "glass-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 lg:static lg:z-auto",
          collapsed ? "lg:w-[68px]" : "lg:w-64",
          sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-lg shadow-emerald-500/25">
                CS
              </div>
              <span className="text-sm font-semibold tracking-tight text-text-1 text-shadow-sm">
                ClassSync
              </span>
            </Link>
          )}
          {collapsed && (
            <Link
              href="/"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-lg shadow-emerald-500/25"
            >
              CS
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-[var(--radius-sm)] p-1.5 text-text-2 transition-colors hover:bg-surface-hover hover:text-text-1 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = getNavIcon(item.icon);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "nav-active"
                    : "border border-transparent text-text-2 hover:bg-surface-hover hover:text-text-1",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-border p-3 lg:block">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs text-text-2 transition-colors hover:bg-surface-hover hover:text-text-1"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-[var(--radius-sm)] p-1.5 text-text-2 transition-colors hover:bg-surface-hover hover:text-text-1 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight text-text-1 text-shadow-sm">{title}</h1>
          </div>

          <ProfileMenu fallbackName={userName} />
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
