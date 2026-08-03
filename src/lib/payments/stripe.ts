import Stripe from "stripe";
import type { DecryptedProviderConfig, PaymentAdapter } from "./types";

function getAppUrl(): string {
  return process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

export function createStripeClient(config: DecryptedProviderConfig): Stripe {
  return new Stripe(config.secret, { apiVersion: "2026-07-29.dahlia" });
}

export function verifyStripeWebhook(
  config: DecryptedProviderConfig,
  body: string,
  signature: string,
): Stripe.Event | null {
  if (!config.webhookSecret) return null;
  try {
    const stripe = createStripeClient(config);
    return stripe.webhooks.constructEvent(body, signature, config.webhookSecret);
  } catch {
    return null;
  }
}

export const stripeAdapter: PaymentAdapter = {
  provider: "STRIPE",
  async createOrder(config, amount, invoiceId, receipt, schoolId) {
    const stripe = createStripeClient(config);
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: `Fee Payment (${receipt})` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId, schoolId },
      success_url: `${appUrl}/parent/fees`,
      cancel_url: `${appUrl}/parent/fees/payment-cancel`,
    });

    if (!session.url) {
      throw new Error("Failed to create Stripe checkout session");
    }

    return {
      provider: "STRIPE",
      sessionId: session.id,
      url: session.url,
      publicKey: config.publicKey,
    };
  },
};
