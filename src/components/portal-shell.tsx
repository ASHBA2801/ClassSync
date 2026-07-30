import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface PortalShellProps {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
  userName?: string;
}

export function PortalShell({ title, navItems, children, userName }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">ClassSync</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          {userName && <p className="text-sm text-zinc-600">{userName}</p>}
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <nav className="w-56 shrink-0 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              {item.label}
            </Link>
          ))}
          <form action="/api/auth/signout" method="POST" className="pt-4">
            <button type="submit" className="px-3 py-2 text-sm text-red-600 hover:underline">
              Sign out
            </button>
          </form>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
