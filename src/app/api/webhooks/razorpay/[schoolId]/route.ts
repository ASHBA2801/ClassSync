import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { acquireIdempotencyKey } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const valid = await verifyWebhookSignature(schoolId, body, signature);
  if (!valid) {
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

    const idempotencyOk = await acquireIdempotencyKey(
      `razorpay:${paymentEntity.id}`,
    );
    if (!idempotencyOk) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: paymentEntity.order_id, schoolId },
      include: { feeInvoice: true },
    });

    if (payment) {
      const paidAmount = paymentEntity.amount / 100;
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: paymentEntity.id,
        },
      });

      const invoice = payment.feeInvoice;
      const newPaid = Number(invoice.paidAmount) + paidAmount;
      const total = Number(invoice.amount);

      await prisma.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          status: newPaid >= total ? "PAID" : "PARTIALLY_PAID",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
