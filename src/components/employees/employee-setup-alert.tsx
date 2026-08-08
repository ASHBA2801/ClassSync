"use client";

import Link from "next/link";
import type { PayrollReadiness } from "@/lib/payroll/readiness";
import { Button } from "@/components/ui/button";

interface Props {
  readiness: PayrollReadiness;
}

export function EmployeeSetupAlert({ readiness }: Props) {
  const issueCount =
    readiness.missingSalaryCount +
    readiness.missingBankCount +
    readiness.unverifiedBankCount;

  if (issueCount === 0) return null;

  const firstIncomplete = readiness.incompleteEmployees[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning-light px-4 py-3">
      <div>
        <p className="text-sm font-medium text-text-1">Payroll setup incomplete</p>
        <p className="text-sm text-text-2">
          {readiness.missingSalaryCount > 0 && `${readiness.missingSalaryCount} missing salary`}
          {readiness.missingSalaryCount > 0 && (readiness.missingBankCount + readiness.unverifiedBankCount) > 0 && " · "}
          {(readiness.missingBankCount + readiness.unverifiedBankCount) > 0 &&
            `${readiness.missingBankCount + readiness.unverifiedBankCount} bank issue(s)`}
        </p>
      </div>
      <div className="flex gap-2">
        {firstIncomplete && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/employees/${firstIncomplete.id}`}>Fix setup</Link>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/employees/payroll">View payroll</Link>
        </Button>
      </div>
    </div>
  );
}
