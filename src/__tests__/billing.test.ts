import { describe, expect, it } from "vitest";
import { isSubscriptionCurrent, periodEndFrom } from "@/lib/billing/users";

describe("core module billing helpers", () => {
  it("adds one year for YEAR interval", () => {
    const start = new Date("2026-08-18T00:00:00.000Z");
    const end = periodEndFrom(start, "YEAR");
    expect(end.toISOString()).toBe("2027-08-18T00:00:00.000Z");
  });

  it("adds one month for MONTH interval", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = periodEndFrom(start, "MONTH");
    expect(end.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("treats an active unexpired subscription as current", () => {
    expect(
      isSubscriptionCurrent(
        { status: "ACTIVE", currentPeriodEnd: new Date("2099-01-01") },
        new Date("2026-08-18"),
      ),
    ).toBe(true);
  });

  it("treats an expired period as not current", () => {
    expect(
      isSubscriptionCurrent(
        { status: "ACTIVE", currentPeriodEnd: new Date("2020-01-01") },
        new Date("2026-08-18"),
      ),
    ).toBe(false);
  });
});
