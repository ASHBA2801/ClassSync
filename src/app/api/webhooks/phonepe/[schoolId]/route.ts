import { NextRequest, NextResponse } from "next/server";
import { acquireIdempotencyKey } from "@/lib/rate-limit";
import { completePayment } from "@/lib/payments/complete-payment";
import { getProviderConfig } from "@/lib/payments/registry";
import { verifyPhonePeWebhook } from "@/lib/payments/phonepe";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const body = await req.text();
  const xVerify = req.headers.get("x-verify") ?? "";

  const config = await getProviderConfig(schoolId, "PHONEPE");
  if (!config || !verifyPhonePeWebhook(config, body, xVerify)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    success: boolean;
    code: string;
    data: {
      merchantTransactionId: string;
      transactionId: string;
      amount: number;
      state: string;
    };
  };

  if (payload.success && payload.code === "PAYMENT_SUCCESS") {
    const { merchantTransactionId, transactionId, amount } = payload.data;

    const idempotencyOk = await acquireIdempotencyKey(`phonepe:${transactionId}`);
    if (!idempotencyOk) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await completePayment({
      schoolId,
      externalOrderId: merchantTransactionId,
      externalPaymentId: transactionId,
      paidAmount: amount / 100,
      provider: "PHONEPE",
    });
  }

  return NextResponse.json({ received: true });
}
