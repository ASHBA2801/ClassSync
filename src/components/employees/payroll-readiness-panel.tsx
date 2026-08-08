"use client";

import Link from "next/link";
import type { PayrollReadiness } from "@/lib/payroll/readiness";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PayrollReadinessPanel({
  readiness,
  payoutWebhookUrl,
}: {
  readiness: PayrollReadiness;
  payoutWebhookUrl?: string;
}) {
  const checklist = [
    {
      label: "RazorpayX configured",
      ok: readiness.razorpayXConfigured,
      href: "/admin/settings",
    },
    {
      label: "RazorpayX payouts enabled",
      ok: readiness.razorpayXEnabled,
      href: "/admin/settings",
    },
    {
      label: "All active employees have salary set",
      ok: readiness.missingSalaryCount === 0,
      href: "/admin/employees",
    },
    {
      label: "All active employees have verified bank accounts",
      ok: readiness.missingBankCount === 0 && readiness.unverifiedBankCount === 0,
      href: "/admin/employees",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Readiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-3">
            <p className="text-xs text-text-2">Active employees</p>
            <p className="text-lg font-semibold">{readiness.activeEmployeeCount}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-xs text-text-2">Missing salary</p>
            <p className="text-lg font-semibold">{readiness.missingSalaryCount}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-xs text-text-2">Bank issues</p>
            <p className="text-lg font-semibold">{readiness.missingBankCount + readiness.unverifiedBankCount}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-xs text-text-2">Auto-payout</p>
            <p className="text-lg font-semibold">{readiness.autoPayoutEnabled ? "On" : "Off"}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center justify-between text-sm">
              <Link href={item.href} className="hover:underline">{item.label}</Link>
              <Badge variant={item.ok ? "success" : "warning"}>{item.ok ? "Ready" : "Action needed"}</Badge>
            </li>
          ))}
        </ul>

        {readiness.incompleteEmployees.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-warning/30 bg-warning-light p-3">
            <p className="text-sm font-medium">Employees needing setup</p>
            <ul className="mt-2 space-y-1 text-sm text-text-2">
              {readiness.incompleteEmployees.slice(0, 8).map((employee) => (
                <li key={employee.id}>
                  <Link href={`/admin/employees/${employee.id}`} className="hover:underline">
                    {employee.employeeCode} · {employee.name}
                  </Link>
                  {" — "}
                  {employee.issues.join(", ").replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-text-2">
          Webhook URL for RazorpayX:{" "}
          <code className="glass-panel break-all rounded px-1">
            {payoutWebhookUrl ?? "/api/webhooks/razorpay-payout/[schoolId]"}
          </code>
        </p>
      </CardContent>
    </Card>
  );
}
