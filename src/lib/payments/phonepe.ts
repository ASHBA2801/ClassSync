import crypto from "crypto";
import type { DecryptedProviderConfig, PaymentAdapter } from "./types";

function getPhonePeBaseUrl(mode: string): string {
  return mode === "live"
    ? "https://api.phonepe.com/apis/hermes"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";
}

function getSaltIndex(config: DecryptedProviderConfig): string {
  return (config.configJson?.saltIndex as string) ?? "1";
}

export function computePhonePeChecksum(payload: string, path: string, saltKey: string, saltIndex: string): string {
  const hash = crypto.createHash("sha256").update(`${payload}${path}${saltKey}`).digest("hex");
  return `${hash}###${saltIndex}`;
}

export function verifyPhonePeWebhook(
  config: DecryptedProviderConfig,
  body: string,
  xVerify: string,
): boolean {
  const saltIndex = getSaltIndex(config);
  const expected = computePhonePeChecksum(body, "", config.secret, saltIndex);
  return expected === xVerify;
}

function getAppUrl(): string {
  return process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

export const phonepeAdapter: PaymentAdapter = {
  provider: "PHONEPE",
  async createOrder(config, amount, invoiceId, receipt, schoolId) {
    const mode = (config.configJson?.mode as string) ?? "sandbox";
    const baseUrl = getPhonePeBaseUrl(mode);
    const saltIndex = getSaltIndex(config);
    const merchantTransactionId = `${receipt}_${Date.now()}`;
    const appUrl = getAppUrl();

    const payload = {
      merchantId: config.publicKey,
      merchantTransactionId,
      merchantUserId: schoolId.slice(0, 8),
      amount: Math.round(amount * 100),
      redirectUrl: `${appUrl}/parent/fees`,
      redirectMode: "REDIRECT",
      callbackUrl: `${appUrl}/api/webhooks/phonepe/${schoolId}`,
      mobileNumber: "9999999999",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const checksum = computePhonePeChecksum(payloadBase64, "/pg/v1/pay", config.secret, saltIndex);

    const res = await fetch(`${baseUrl}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    if (!res.ok) {
      throw new Error("Failed to create PhonePe payment");
    }

    const data = (await res.json()) as {
      success: boolean;
      data: { instrumentResponse: { redirectInfo: { url: string } } };
    };

    if (!data.success) {
      throw new Error("PhonePe payment initiation failed");
    }

    return {
      provider: "PHONEPE",
      redirectUrl: data.data.instrumentResponse.redirectInfo.url,
      merchantTransactionId,
    };
  },
};

export async function getPhonePePaymentStatus(
  config: DecryptedProviderConfig,
  merchantTransactionId: string,
): Promise<{ success: boolean; transactionId?: string; amount?: number }> {
  const mode = (config.configJson?.mode as string) ?? "sandbox";
  const baseUrl = getPhonePeBaseUrl(mode);
  const saltIndex = getSaltIndex(config);
  const path = `/pg/v1/status/${config.publicKey}/${merchantTransactionId}`;
  const checksum = computePhonePeChecksum("", path, config.secret, saltIndex);

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "X-VERIFY": checksum, "X-MERCHANT-ID": config.publicKey },
  });

  if (!res.ok) return { success: false };

  const data = (await res.json()) as {
    success: boolean;
    code: string;
    data: { transactionId: string; amount: number; state: string };
  };

  return {
    success: data.success && data.code === "PAYMENT_SUCCESS",
    transactionId: data.data?.transactionId,
    amount: data.data?.amount ? data.data.amount / 100 : undefined,
  };
}
