import type { SalaryPayoutStatus } from "@prisma/client";

export type PayoutStatusSummary = Record<SalaryPayoutStatus, number>;

export function summarizePayoutStatuses(
  payouts: { status: SalaryPayoutStatus }[],
): PayoutStatusSummary {
  const summary: PayoutStatusSummary = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCESS: 0,
    FAILED: 0,
    REVERSED: 0,
  };
  for (const payout of payouts) {
    summary[payout.status]++;
  }
  return summary;
}

export function payoutStatusBadgeVariant(
  status: string,
): "success" | "warning" | "danger" | "info" | "outline" {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "PROCESSING":
      return "info";
    case "PENDING":
      return "outline";
    case "FAILED":
    case "REVERSED":
      return "danger";
    default:
      return "outline";
  }
}

export function payoutStatusLabel(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Failed";
    case "REVERSED":
      return "Reversed";
    default:
      return status;
  }
}

export function formatPayoutSummary(summary: PayoutStatusSummary): string {
  const parts: string[] = [];
  if (summary.SUCCESS > 0) parts.push(`${summary.SUCCESS} paid`);
  if (summary.PROCESSING > 0) parts.push(`${summary.PROCESSING} processing`);
  if (summary.PENDING > 0) parts.push(`${summary.PENDING} pending`);
  if (summary.FAILED > 0) parts.push(`${summary.FAILED} failed`);
  if (summary.REVERSED > 0) parts.push(`${summary.REVERSED} reversed`);
  return parts.length > 0 ? parts.join(" · ") : "No payouts";
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
