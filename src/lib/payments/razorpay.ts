import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption";

export async function getRazorpayClientForSchool(schoolId: string): Promise<Razorpay> {
  const config = await prisma.schoolPaymentConfig.findUnique({ where: { schoolId } });
  if (!config) {
    throw new Error("Payment not configured for this school");
  }

  const keySecret = decrypt(config.razorpayKeySecretEncrypted);
  return new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: keySecret,
  });
}

export async function verifyWebhookSignature(
  schoolId: string,
  body: string,
  signature: string,
): Promise<boolean> {
  const config = await prisma.schoolPaymentConfig.findUnique({ where: { schoolId } });
  if (!config?.webhookSecretEncrypted) return false;

  const secret = decrypt(config.webhookSecretEncrypted);
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export async function createPaymentOrder(
  schoolId: string,
  amount: number,
  invoiceId: string,
  receipt: string,
) {
  const razorpay = await getRazorpayClientForSchool(schoolId);
  return razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt,
    notes: { invoiceId, schoolId },
  });
}
