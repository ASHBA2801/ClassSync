"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, GraduationCap } from "lucide-react";
import { getAllLinkedChildrenAction } from "@/actions/parent";
import { useApplyContext } from "@/hooks/use-apply-context";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ChildOption = {
  studentId: string;
  studentName: string;
  schoolId: string;
  schoolName: string;
  classSectionName: string | null;
};

export function ChildSwitcher() {
  const { data: session } = useSession();
  const { applyContext, loading } = useApplyContext();
  const [children, setChildren] = useState<ChildOption[]>([]);
  const activeStudentId = session?.user?.activeStudentId ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getAllLinkedChildrenAction();
        if (!cancelled) setChildren(list);
      } catch {
        if (!cancelled) setChildren([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (children.length === 0) return null;

  const active =
    children.find((c) => c.studentId === activeStudentId) ?? children[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={loading}
          className="flex max-w-[220px] items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pl-1 pr-2.5 text-left transition-all hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:max-w-[280px]"
        >
          <div className="icon-ring h-8 w-8 shrink-0">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium text-text-1 leading-tight">
              {active.studentName}
            </p>
            <p className="truncate text-[11px] text-text-3 leading-tight">
              {active.schoolName}
            </p>
          </div>
          {children.length > 1 && (
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-text-2 sm:block" />
          )}
        </button>
      </DropdownMenuTrigger>

      {children.length > 1 && (
        <DropdownMenuContent align="end" className="w-72 p-1.5">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs text-text-3">
            Switch child
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {children.map((child) => {
            const isActive = child.studentId === active.studentId;
            return (
              <DropdownMenuItem
                key={child.studentId}
                disabled={loading || isActive}
                className={cn("flex cursor-pointer items-start gap-2 py-2", isActive && "bg-surface-hover")}
                onSelect={() => {
                  void applyContext({
                    role: "PARENT",
                    schoolId: child.schoolId,
                    activeStudentId: child.studentId,
                  });
                }}
              >
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-text-2" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-1">{child.studentName}</p>
                  <p className="truncate text-xs text-text-2">
                    {child.schoolName}
                    {child.classSectionName ? ` · ${child.classSectionName}` : ""}
                  </p>
                </div>
                {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
