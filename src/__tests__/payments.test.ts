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
