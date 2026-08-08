"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/admin/employees", label: "All Employees", match: (path: string) => path === "/admin/employees" },
  { href: "/admin/employees/new", label: "Add Employee", match: (path: string) => path === "/admin/employees/new" },
  { href: "/admin/employees/settings", label: "Job Types", match: (path: string) => path === "/admin/employees/settings" },
] as const;

export function EmployeesSectionNav() {
  const pathname = usePathname();

  return (
    <div className="glass-panel flex flex-wrap gap-1 rounded-[var(--radius-md)] p-1">
      {sections.map((section) => {
        const active = section.match(pathname);
        return (
          <Link
            key={section.href}
            href={section.href}
            className={cn(
              "rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:bg-surface-2 hover:text-text-1",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
