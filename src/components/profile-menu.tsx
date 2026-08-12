"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowLeftRight,
  ChevronDown,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  UserCircle,
} from "lucide-react";
import { formatRoleLabel } from "@/lib/nav-config";
import { listUserContextsAction } from "@/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface ProfileMenuProps {
  fallbackName?: string;
}

export function ProfileMenu({ fallbackName }: ProfileMenuProps) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? fallbackName ?? "Account";
  const email = session?.user?.email ?? "";
  const role = session?.user?.role ? formatRoleLabel(session.user.role) : "";
  const [canSwitch, setCanSwitch] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const contexts = await listUserContextsAction();
        if (cancelled) return;
        setCanSwitch(contexts.hasMultiple);
      } catch {
        if (!cancelled) setCanSwitch(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, session?.user?.role]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pl-1 pr-2.5 text-left transition-all hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:pr-3"
        >
          <div className="icon-ring h-8 w-8 shrink-0 text-xs font-semibold text-primary">
            {getInitials(name)}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium text-text-1 leading-tight">{name}</p>
            {role && role !== name && (
              <p className="truncate text-[11px] text-text-3 leading-tight">{role}</p>
            )}
          </div>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-text-2 sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <div className="flex items-center gap-2.5">
            <div className="icon-ring h-9 w-9 shrink-0 text-xs font-semibold text-primary">
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-1">{name}</p>
              {email && <p className="truncate text-xs text-text-2">{email}</p>}
              {role && <p className="mt-0.5 text-[11px] font-medium text-primary">{role}</p>}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {canSwitch && (
          <>
            <DropdownMenuItem asChild>
              <Link
                href="/select-context?switch=1"
                className="flex cursor-pointer items-center gap-2"
              >
                <ArrowLeftRight className="h-4 w-4 text-text-2" />
                Switch role
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <Link href="/account/profile" className="flex cursor-pointer items-center gap-2">
            <UserCircle className="h-4 w-4 text-text-2" />
            Profile details
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/account/password" className="flex cursor-pointer items-center gap-2">
            <KeyRound className="h-4 w-4 text-text-2" />
            Change password
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/account/sessions" className="flex cursor-pointer items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-text-2" />
            Active sessions
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex cursor-pointer items-center gap-2 text-danger focus:text-danger"
          onSelect={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
