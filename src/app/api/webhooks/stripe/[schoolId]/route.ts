import { NextRequest, NextResponse } from "next/server";
import { acquireIdempotencyKey } from "@/lib/rate-limit";
import { completePayment } from "@/lib/payments/complete-payment";
import { getProviderConfig } from "@/lib/payments/registry";
import { verifyStripeWebhook } from "@/lib/payments/stripe";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const config = await getProviderConfig(schoolId, "STRIPE");
  if (!config) {
    return NextResponse.json({ error: "Not configured" }, { status: 404 });
  }

  const event = verifyStripeWebhook(config, body, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent?: string;
      amount_total?: number;
      metadata?: { invoiceId?: string; schoolId?: string };
    };

    const paymentId = session.payment_intent ?? session.id;
    const idempotencyOk = await acquireIdempotencyKey(`stripe:${paymentId}`);
    if (!idempotencyOk) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await completePayment({
      schoolId,
      externalOrderId: session.id,
      externalPaymentId: String(paymentId),
      paidAmount: (session.amount_total ?? 0) / 100,
      provider: "STRIPE",
    });
  }

  return NextResponse.json({ received: true });
}
