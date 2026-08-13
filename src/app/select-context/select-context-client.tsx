"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase, ChevronLeft, GraduationCap, Users } from "lucide-react";
import type { Role } from "@prisma/client";
import { resolveContextDestinationAction } from "@/actions/auth";
import type { UserContexts } from "@/lib/auth/contexts";
import { formatRoleLabel } from "@/lib/nav-config";
import { useApplyContext } from "@/hooks/use-apply-context";

type Step = "loading" | "role" | "employee" | "parent";

export function SelectContextClient() {
  const searchParams = useSearchParams();
  const forcePicker = searchParams.get("switch") === "1";
  const { applyContext, loading, error } = useApplyContext();
  const [contexts, setContexts] = useState<UserContexts | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const dest = await resolveContextDestinationAction({ forcePicker });
        if (cancelled) return;

        if (!dest.needsPicker) {
          if (dest.defaultSwitch) {
            await applyContext(dest.defaultSwitch);
          } else {
            window.location.replace(dest.redirectTo);
          }
          return;
        }

        setContexts(dest.contexts);
        const hasEmp = dest.contexts.employee.length > 0;
        const hasPar = dest.contexts.parent.length > 0;

        if (hasEmp && hasPar) {
          setStep("role");
        } else if (hasPar) {
          setStep("parent");
        } else if (hasEmp) {
          if (dest.contexts.employee.length === 1 && !forcePicker) {
            const emp = dest.contexts.employee[0]!;
            await applyContext({
              role: emp.role,
              schoolId: emp.role === "SYSTEM_ADMIN" ? null : emp.schoolId,
            });
            return;
          }
          setStep("employee");
        } else {
          setBootError("No active school roles found for this account.");
          setStep("role");
        }
      } catch {
        if (!cancelled) setBootError("Could not load account contexts.");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when switch mode changes
  }, [forcePicker]);

  async function pickEmployee(role: Role, schoolId: string) {
    await applyContext({
      role,
      schoolId: role === "SYSTEM_ADMIN" ? null : schoolId,
      activeStudentId: null,
    });
  }

  async function pickChild(studentId: string, schoolId: string) {
    await applyContext({
      role: "PARENT",
      schoolId,
      activeStudentId: studentId,
    });
  }

  if (step === "loading" || !contexts) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-text-2">{bootError ?? "Preparing your portal…"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === "role" && (
        <>
          <p className="text-sm text-text-2">How would you like to continue?</p>
          <div className="grid gap-3">
            {contexts.employee.length > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (contexts.employee.length === 1) {
                    const emp = contexts.employee[0]!;
                    void pickEmployee(emp.role, emp.schoolId);
                  } else {
                    setStep("employee");
                  }
                }}
                className="glass-nested flex items-center gap-3 p-4 text-left transition hover:border-border-strong"
              >
                <div className="icon-ring h-10 w-10 shrink-0">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-1">Employee</p>
                  <p className="text-xs text-text-2">
                    {contexts.employee.length === 1
                      ? `${formatRoleLabel(contexts.employee[0]!.role)} · ${contexts.employee[0]!.schoolName}`
                      : `${contexts.employee.length} roles available`}
                  </p>
                </div>
              </button>
            )}
            {contexts.parent.length > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep("parent")}
                className="glass-nested flex items-center gap-3 p-4 text-left transition hover:border-border-strong"
              >
                <div className="icon-ring h-10 w-10 shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-1">Parent</p>
                  <p className="text-xs text-text-2">
                    {contexts.parent.length === 1
                      ? `${contexts.parent[0]!.studentName} · ${contexts.parent[0]!.schoolName}`
                      : `${contexts.parent.length} children linked`}
                  </p>
                </div>
              </button>
            )}
          </div>
        </>
      )}

      {step === "employee" && (
        <>
          <div className="flex items-center gap-2">
            {(contexts.parent.length > 0 || contexts.employee.length > 1) && (
              <button
                type="button"
                className="rounded p-1 text-text-2 hover:bg-surface-hover hover:text-text-1"
                onClick={() => setStep(contexts.parent.length > 0 ? "role" : "employee")}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <p className="text-sm text-text-2">Select your employee role</p>
          </div>
          <div className="grid gap-2">
            {contexts.employee.map((emp) => (
              <button
                key={emp.membershipId}
                type="button"
                disabled={loading}
                onClick={() => void pickEmployee(emp.role, emp.schoolId)}
                className="glass-nested flex items-center gap-3 p-3 text-left transition hover:border-border-strong"
              >
                <div className="icon-ring h-9 w-9 shrink-0">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-1">
                    {formatRoleLabel(emp.role)}
                  </p>
                  <p className="truncate text-xs text-text-2">{emp.schoolName}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "parent" && (
        <>
          <div className="flex items-center gap-2">
            {contexts.employee.length > 0 && (
              <button
                type="button"
                className="rounded p-1 text-text-2 hover:bg-surface-hover hover:text-text-1"
                onClick={() => setStep("role")}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <p className="text-sm text-text-2">Select a child to continue</p>
          </div>
          <div className="grid gap-2">
            {contexts.parent.map((child) => (
              <button
                key={child.studentId}
                type="button"
                disabled={loading}
                onClick={() => void pickChild(child.studentId, child.schoolId)}
                className="glass-nested flex items-center gap-3 p-3 text-left transition hover:border-border-strong"
              >
                <div className="icon-ring h-9 w-9 shrink-0">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-1">{child.studentName}</p>
                  <p className="truncate text-xs text-text-2">
                    {child.schoolName}
                    {child.classSectionName ? ` · ${child.classSectionName}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {(error || bootError) && (
        <p className="text-sm text-destructive">{error ?? bootError}</p>
      )}
      {loading && <p className="text-center text-xs text-text-3">Switching…</p>}
    </div>
  );
}
