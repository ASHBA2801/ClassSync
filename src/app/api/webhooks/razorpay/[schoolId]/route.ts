import { NextRequest, NextResponse } from "next/server";
import { acquireIdempotencyKey } from "@/lib/rate-limit";
import { completePayment } from "@/lib/payments/complete-payment";
import { getProviderConfig } from "@/lib/payments/registry";
import { verifyRazorpayWebhook } from "@/lib/payments/razorpay";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const config = await getProviderConfig(schoolId, "RAZORPAY");
  if (!config || !verifyRazorpayWebhook(config, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    event: string;
    payload: {
      payment?: { entity: { id: string; order_id: string; amount: number; status: string } };
    };
  };

  if (payload.event === "payment.captured") {
    const paymentEntity = payload.payload.payment?.entity;
    if (!paymentEntity) {
      return NextResponse.json({ received: true });
    }

    const idempotencyOk = await acquireIdempotencyKey(`razorpay:${paymentEntity.id}`);
    if (!idempotencyOk) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await completePayment({
      schoolId,
      externalOrderId: paymentEntity.order_id,
      externalPaymentId: paymentEntity.id,
      paidAmount: paymentEntity.amount / 100,
      provider: "RAZORPAY",
    });
  }

  return NextResponse.json({ received: true });
}
