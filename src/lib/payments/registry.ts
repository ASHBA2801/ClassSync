import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";
import type { PaymentProvider } from "@prisma/client";
import {
  PAYMENT_PROVIDER_META,
  PAYMENT_PROVIDERS,
  type AdminProviderInfo,
  type DecryptedProviderConfig,
  type PaymentOrderResult,
  type PublicProviderInfo,
} from "./types";
import { razorpayAdapter } from "./razorpay";
import { stripeAdapter } from "./stripe";
import { paypalAdapter } from "./paypal";
import { phonepeAdapter } from "./phonepe";

const adapters = {
  RAZORPAY: razorpayAdapter,
  STRIPE: stripeAdapter,
  PAYPAL: paypalAdapter,
  PHONEPE: phonepeAdapter,
} as const;

export async function getProviderConfig(
  schoolId: string,
  provider: PaymentProvider,
): Promise<DecryptedProviderConfig | null> {
  const row = await prisma.schoolPaymentProviderConfig.findUnique({
    where: { schoolId_provider: { schoolId, provider } },
  });

  if (!row || !row.isEnabled) return null;

  return {
    provider: row.provider,
    publicKey: row.publicKey,
    secret: decrypt(row.secretEncrypted),
    webhookSecret: row.webhookSecretEncrypted ? decrypt(row.webhookSecretEncrypted) : undefined,
    configJson: (row.configJson as Record<string, unknown>) ?? undefined,
  };
}

export async function getEnabledProvidersForSchool(schoolId: string): Promise<PublicProviderInfo[]> {
  const rows = await prisma.schoolPaymentProviderConfig.findMany({
    where: { schoolId, isEnabled: true },
    orderBy: { provider: "asc" },
  });

  return rows.map((row) => ({
    provider: row.provider,
    label: PAYMENT_PROVIDER_META[row.provider].label,
    publicKey: row.publicKey,
  }));
}

export async function listAdminProviderConfigs(
  schoolId: string,
): Promise<AdminProviderInfo[]> {
  const rows = await prisma.schoolPaymentProviderConfig.findMany({
    where: { schoolId },
  });
  const rowMap = new Map(rows.map((r) => [r.provider, r]));

  return PAYMENT_PROVIDERS.map((provider) => {
    const row = rowMap.get(provider);
    const meta = PAYMENT_PROVIDER_META[provider];
    return {
      provider,
      label: meta.label,
      isEnabled: row?.isEnabled ?? false,
      isConfigured: Boolean(row),
      publicKey: row?.publicKey ?? null,
      webhookPath: meta.webhookPath(schoolId),
      configJson: (row?.configJson as Record<string, unknown>) ?? null,
    };
  });
}

export async function createProviderPaymentOrder(
  schoolId: string,
  provider: PaymentProvider,
  amount: number,
  invoiceId: string,
  receipt: string,
  options?: { returnPath?: string; productName?: string },
): Promise<PaymentOrderResult> {
  const config = await getProviderConfig(schoolId, provider);
  if (!config) {
    throw new Error(`Payment provider ${provider} is not configured for this school`);
  }

  const adapter = adapters[provider];
  return adapter.createOrder(config, amount, invoiceId, receipt, schoolId, options);
}

export function getExternalOrderId(result: PaymentOrderResult): string {
  switch (result.provider) {
    case "RAZORPAY":
      return result.orderId;
    case "STRIPE":
      return result.sessionId;
    case "PAYPAL":
      return result.orderId;
    case "PHONEPE":
      return result.merchantTransactionId;
  }
}

export { getProviderConfig as getDecryptedProviderConfig };
