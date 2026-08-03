import { z } from "zod";
import type { PaymentProvider } from "@prisma/client";

export type { PaymentProvider };

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  "RAZORPAY",
  "PHONEPE",
  "PAYPAL",
  "STRIPE",
];

export const PAYMENT_PROVIDER_META: Record<
  PaymentProvider,
  {
    label: string;
    webhookPath: (schoolId: string) => string;
    description: string;
  }
> = {
  RAZORPAY: {
    label: "Razorpay",
    webhookPath: (schoolId) => `/api/webhooks/razorpay/${schoolId}`,
    description: "Popular Indian payment gateway with UPI, cards, and net banking.",
  },
  PHONEPE: {
    label: "PhonePe",
    webhookPath: (schoolId) => `/api/webhooks/phonepe/${schoolId}`,
    description: "UPI and wallet payments via PhonePe.",
  },
  PAYPAL: {
    label: "PayPal",
    webhookPath: (schoolId) => `/api/webhooks/paypal/${schoolId}`,
    description: "International payments via PayPal.",
  },
  STRIPE: {
    label: "Stripe",
    webhookPath: (schoolId) => `/api/webhooks/stripe/${schoolId}`,
    description: "Global card payments via Stripe Checkout.",
  },
};

const baseConfigSchema = z.object({
  provider: z.enum(["RAZORPAY", "PHONEPE", "PAYPAL", "STRIPE"]),
  isEnabled: z.boolean(),
  publicKey: z.string().optional(),
  secret: z.string().optional(),
  webhookSecret: z.string().optional(),
  saltIndex: z.string().optional(),
  mode: z.enum(["sandbox", "live"]).optional(),
});

export const paymentProviderConfigSchema = baseConfigSchema.superRefine((data, ctx) => {
  if (!data.isEnabled) return;

  const requireField = (field: keyof typeof data, message: string) => {
    if (!data[field] || (typeof data[field] === "string" && !data[field]?.trim())) {
      ctx.addIssue({ code: "custom", message, path: [field] });
    }
  };

  switch (data.provider) {
    case "RAZORPAY":
      requireField("publicKey", "Key ID is required");
      requireField("secret", "Key Secret is required");
      break;
    case "STRIPE":
      requireField("publicKey", "Publishable key is required");
      requireField("secret", "Secret key is required");
      requireField("webhookSecret", "Webhook secret is required");
      break;
    case "PAYPAL":
      requireField("publicKey", "Client ID is required");
      requireField("secret", "Client secret is required");
      break;
    case "PHONEPE":
      requireField("publicKey", "Merchant ID is required");
      requireField("secret", "Salt key is required");
      requireField("saltIndex", "Salt index is required");
      break;
  }
});

export type PaymentProviderConfigInput = z.infer<typeof paymentProviderConfigSchema>;

export interface DecryptedProviderConfig {
  provider: PaymentProvider;
  publicKey: string;
  secret: string;
  webhookSecret?: string;
  configJson?: Record<string, unknown>;
}

export interface PublicProviderInfo {
  provider: PaymentProvider;
  label: string;
  publicKey: string;
}

export interface AdminProviderInfo {
  provider: PaymentProvider;
  label: string;
  isEnabled: boolean;
  isConfigured: boolean;
  publicKey: string | null;
  webhookPath: string;
  configJson?: Record<string, unknown> | null;
}

export type RazorpayOrderResult = {
  provider: "RAZORPAY";
  orderId: string;
  amount: number;
  currency: string;
  publicKey: string;
};

export type StripeOrderResult = {
  provider: "STRIPE";
  sessionId: string;
  url: string;
  publicKey: string;
};

export type PayPalOrderResult = {
  provider: "PAYPAL";
  orderId: string;
  publicKey: string;
  amount: number;
  currency: string;
};

export type PhonePeOrderResult = {
  provider: "PHONEPE";
  redirectUrl: string;
  merchantTransactionId: string;
};

export type PaymentOrderResult =
  | RazorpayOrderResult
  | StripeOrderResult
  | PayPalOrderResult
  | PhonePeOrderResult;

export interface PaymentAdapter {
  provider: PaymentProvider;
  createOrder(
    config: DecryptedProviderConfig,
    amount: number,
    invoiceId: string,
    receipt: string,
    schoolId: string,
  ): Promise<PaymentOrderResult>;
}
