import { NextRequest, NextResponse } from "next/server";
import { acquireIdempotencyKey } from "@/lib/rate-limit";
import { getPayoutConfig, verifyPayoutWebhook } from "@/lib/payouts/razorpayx";
import { handlePayoutWebhook } from "@/lib/payouts/execute";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const config = await getPayoutConfig(schoolId);
  if (!config || !verifyPayoutWebhook(config, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as {
    event: string;
    payload: {
      payout?: { entity: { id: string; status: string; failure_reason?: string } };
    };
  };

  if (payload.event.startsWith("payout.")) {
    const payoutEntity = payload.payload.payout?.entity;
    if (!payoutEntity) {
      return NextResponse.json({ received: true });
    }

    const idempotencyOk = await acquireIdempotencyKey(`razorpay-payout:${payoutEntity.id}:${payload.event}`);
    if (!idempotencyOk) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await handlePayoutWebhook(
      schoolId,
      payoutEntity.id,
      payoutEntity.status,
      payoutEntity.failure_reason,
    );
  }

  return NextResponse.json({ received: true });
}
