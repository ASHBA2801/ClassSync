import { describe, it, expect } from "vitest";
import { computePhonePeChecksum } from "@/lib/payments/phonepe";

describe("PhonePe checksum", () => {
  it("computes checksum in expected format", () => {
    const payload = Buffer.from(JSON.stringify({ test: true })).toString("base64");
    const checksum = computePhonePeChecksum(payload, "/pg/v1/pay", "test-salt-key", "1");
    expect(checksum).toMatch(/^[a-f0-9]{64}###1$/);
  });

  it("produces different checksums for different payloads", () => {
    const a = computePhonePeChecksum("payloadA", "/pg/v1/pay", "salt", "1");
    const b = computePhonePeChecksum("payloadB", "/pg/v1/pay", "salt", "1");
    expect(a).not.toBe(b);
  });

  it("includes salt index suffix", () => {
    const checksum = computePhonePeChecksum("payload", "/pg/v1/pay", "salt", "3");
    expect(checksum.endsWith("###3")).toBe(true);
  });
});

describe("Razorpay payment signature", () => {
  it("verifies order and payment id signature", async () => {
    const { verifyRazorpayPaymentSignature } = await import("@/lib/payments/razorpay");
    const crypto = await import("crypto");
    const secret = "test_secret";
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyRazorpayPaymentSignature(
        { provider: "RAZORPAY", publicKey: "pk", secret },
        orderId,
        paymentId,
        signature,
      ),
    ).toBe(true);
  });
});

describe("Razorpay payout reference id", () => {
  it("keeps short reference ids unchanged", async () => {
    const { toRazorpayReferenceId, RAZORPAY_MAX_REFERENCE_ID_LENGTH } = await import(
      "@/lib/payouts/razorpayx"
    );
    const shortId = "00000000-0000-4000-8000-000000000001";
    expect(shortId.length).toBeLessThanOrEqual(RAZORPAY_MAX_REFERENCE_ID_LENGTH);
    expect(toRazorpayReferenceId(shortId)).toBe(shortId);
  });

  it("hashes long idempotency keys to 40 characters", async () => {
    const { toRazorpayReferenceId, RAZORPAY_MAX_REFERENCE_ID_LENGTH } = await import(
      "@/lib/payouts/razorpayx"
    );
    const longKey = `${"a".repeat(36)}:${"b".repeat(36)}:${"c".repeat(36)}`;
    const referenceId = toRazorpayReferenceId(longKey);
    expect(referenceId.length).toBe(RAZORPAY_MAX_REFERENCE_ID_LENGTH);
  });

  it("sanitizes payout narration for Razorpay rules", async () => {
    const { toRazorpayNarration, formatPayrollNarration, RAZORPAY_MAX_NARRATION_LENGTH } =
      await import("@/lib/payouts/razorpayx");

    expect(toRazorpayNarration("Salary 2026-07")).toBe("Salary 2026 07");
    expect(formatPayrollNarration(new Date("2026-07-01T00:00:00.000Z"))).toBe("Salary 202607");
    expect(toRazorpayNarration("a".repeat(40)).length).toBe(RAZORPAY_MAX_NARRATION_LENGTH);
  });

  it("maps Razorpay payout statuses to internal statuses", async () => {
    const { mapRazorpayPayoutStatus } = await import("@/lib/payouts/razorpayx");

    expect(mapRazorpayPayoutStatus("processed")).toBe("SUCCESS");
    expect(mapRazorpayPayoutStatus("processing")).toBe("PROCESSING");
    expect(mapRazorpayPayoutStatus("queued")).toBe("PROCESSING");
    expect(mapRazorpayPayoutStatus("failed")).toBe("FAILED");
    expect(mapRazorpayPayoutStatus("reversed")).toBe("REVERSED");
  });
});

describe("payment provider config schema", () => {
  it("requires credentials when enabling Razorpay", async () => {
    const { paymentProviderConfigSchema } = await import("@/lib/payments/types");
    const result = paymentProviderConfigSchema.safeParse({
      provider: "RAZORPAY",
      isEnabled: true,
    });
    expect(result.success).toBe(false);
  });

  it("allows disabling without credentials", async () => {
    const { paymentProviderConfigSchema } = await import("@/lib/payments/types");
    const result = paymentProviderConfigSchema.safeParse({
      provider: "RAZORPAY",
      isEnabled: false,
    });
    expect(result.success).toBe(true);
  });
});
