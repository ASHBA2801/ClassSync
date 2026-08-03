import { NextRequest, NextResponse } from "next/server";
import { acquireIdempotencyKey } from "@/lib/rate-limit";
import { completePayment } from "@/lib/payments/complete-payment";
import { getProviderConfig } from "@/lib/payments/registry";
import { verifyPayPalWebhook } from "@/lib/payments/paypal";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const body = await req.text();

  const config = await getProviderConfig(schoolId, "PAYPAL");
  if (!config || !verifyPayPalWebhook(config, body)) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    event_type: string;
    resource: {
      id: string;
      supplementary_data?: { related_ids?: { order_id?: string } };
      amount?: { value: string };
    };
  };

  if (payload.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const captureId = payload.resource.id;
    const orderId = payload.resource.supplementary_data?.related_ids?.order_id;

    const idempotencyOk = await acquireIdempotencyKey(`paypal:${captureId}`);
    if (!idempotencyOk) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (orderId) {
      await completePayment({
        schoolId,
        externalOrderId: orderId,
        externalPaymentId: captureId,
        paidAmount: Number(payload.resource.amount?.value ?? 0),
        provider: "PAYPAL",
      });
    }
  }

  return NextResponse.json({ received: true });
}
