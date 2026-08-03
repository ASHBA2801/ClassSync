import type { DecryptedProviderConfig, PaymentAdapter } from "./types";

function getPayPalBaseUrl(mode: string): string {
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(config: DecryptedProviderConfig): Promise<string> {
  const mode = (config.configJson?.mode as string) ?? "sandbox";
  const baseUrl = getPayPalBaseUrl(mode);
  const auth = Buffer.from(`${config.publicKey}:${config.secret}`).toString("base64");

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error("Failed to authenticate with PayPal");
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function capturePayPalOrder(
  config: DecryptedProviderConfig,
  orderId: string,
): Promise<{ id: string; status: string }> {
  const mode = (config.configJson?.mode as string) ?? "sandbox";
  const baseUrl = getPayPalBaseUrl(mode);
  const token = await getPayPalAccessToken(config);

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to capture PayPal order");
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    purchase_units: Array<{
      payments: { captures: Array<{ id: string; amount: { value: string } }> };
    }>;
  };

  const capture = data.purchase_units[0]?.payments?.captures[0];
  return { id: capture?.id ?? data.id, status: data.status };
}

export function verifyPayPalWebhook(
  config: DecryptedProviderConfig,
  body: string,
): boolean {
  if (!config.webhookSecret) return false;

  try {
    const payload = JSON.parse(body) as { id?: string; event_type?: string };
    return Boolean(payload.event_type);
  } catch {
    return false;
  }
}

export const paypalAdapter: PaymentAdapter = {
  provider: "PAYPAL",
  async createOrder(config, amount, invoiceId, receipt) {
    const mode = (config.configJson?.mode as string) ?? "sandbox";
    const baseUrl = getPayPalBaseUrl(mode);
    const token = await getPayPalAccessToken(config);

    const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: receipt,
            custom_id: invoiceId,
            amount: {
              currency_code: "INR",
              value: amount.toFixed(2),
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create PayPal order");
    }

    const data = (await res.json()) as { id: string };

    return {
      provider: "PAYPAL",
      orderId: data.id,
      publicKey: config.publicKey,
      amount: Math.round(amount * 100),
      currency: "INR",
    };
  },
};
