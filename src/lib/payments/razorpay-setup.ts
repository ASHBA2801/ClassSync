const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export function getRazorpayFeeWebhookUrl(schoolId: string): string {
  return `${APP_URL.replace(/\/$/, "")}/api/webhooks/razorpay/${schoolId}`;
}

export function getRazorpayPayoutWebhookUrl(schoolId: string): string {
  return `${APP_URL.replace(/\/$/, "")}/api/webhooks/razorpay-payout/${schoolId}`;
}

export function isRazorpayTestKey(key: string | null | undefined): boolean {
  return Boolean(key?.startsWith("rzp_test_"));
}

export const RAZORPAY_TEST_CARD = "4111 1111 1111 1111";
