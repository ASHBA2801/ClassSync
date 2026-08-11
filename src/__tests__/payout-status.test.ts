import { describe, expect, it } from "vitest";
import {
  formatPayoutSummary,
  payoutStatusBadgeVariant,
  payoutStatusLabel,
  summarizePayoutStatuses,
} from "@/lib/payroll/payout-status";

describe("payout status helpers", () => {
  it("summarizes payout statuses", () => {
    const summary = summarizePayoutStatuses([
      { status: "SUCCESS" },
      { status: "SUCCESS" },
      { status: "FAILED" },
      { status: "PENDING" },
    ]);

    expect(summary).toEqual({
      PENDING: 1,
      PROCESSING: 0,
      SUCCESS: 2,
      FAILED: 1,
      REVERSED: 0,
    });
    expect(formatPayoutSummary(summary)).toBe("2 paid · 1 pending · 1 failed");
  });

  it("maps status labels and badge variants", () => {
    expect(payoutStatusLabel("SUCCESS")).toBe("Paid");
    expect(payoutStatusLabel("FAILED")).toBe("Failed");
    expect(payoutStatusBadgeVariant("SUCCESS")).toBe("success");
    expect(payoutStatusBadgeVariant("FAILED")).toBe("danger");
    expect(payoutStatusBadgeVariant("PROCESSING")).toBe("info");
  });
});
