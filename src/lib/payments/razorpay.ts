import Razorpay from "razorpay";
import crypto from "crypto";
import type { DecryptedProviderConfig, PaymentAdapter } from "./types";

export function createRazorpayClient(config: DecryptedProviderConfig): Razorpay {
  return new Razorpay({
    key_id: config.publicKey,
    key_secret: config.secret,
  });
}

export function verifyRazorpayWebhook(
  config: DecryptedProviderConfig,
  body: string,
  signature: string,
): boolean {
  if (!config.webhookSecret) return false;
  const expected = crypto.createHmac("sha256", config.webhookSecret).update(body).digest("hex");
  return expected === signature;
}

export function verifyRazorpayPaymentSignature(
  config: DecryptedProviderConfig,
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", config.secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export const razorpayAdapter: PaymentAdapter = {
  provider: "RAZORPAY",
  async createOrder(config, amount, invoiceId, receipt) {
    const razorpay = createRazorpayClient(config);
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes: { invoiceId },
    });

    return {
      provider: "RAZORPAY",
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      publicKey: config.publicKey,
    };
  },
};
