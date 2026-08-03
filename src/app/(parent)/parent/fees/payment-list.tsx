"use client";

import { useState } from "react";
import {
  capturePayPalPaymentAction,
  captureRazorpayPaymentAction,
  createPaymentOrderAction,
} from "@/actions/payments";
import { setPaymentSuccessFlag } from "./payment-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentProvider } from "@prisma/client";
import type { PublicProviderInfo } from "@/lib/payments/types";
import { toast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  amount: string;
  paidAmount: string;
  status: string;
  student: { name: string };
  feeStructure: { name: string };
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (el: HTMLElement) => void };
    };
  }
}

export function PaymentList({
  invoices,
  providers,
}: {
  invoices: Invoice[];
  providers: PublicProviderInfo[];
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(
    providers[0]?.provider ?? "RAZORPAY",
  );
  const [paypalContainer, setPaypalContainer] = useState<string | null>(null);

  const hasProviders = providers.length > 0;

  async function handlePay(invoiceId: string) {
    if (!hasProviders) return;
    setLoading(invoiceId);
    try {
      const order = await createPaymentOrderAction(invoiceId, selectedProvider);

      switch (order.provider) {
        case "RAZORPAY":
          if (typeof window !== "undefined" && window.Razorpay && order.publicKey) {
            const rzp = new window.Razorpay({
              key: order.publicKey,
              amount: order.amount,
              currency: order.currency,
              order_id: order.orderId,
              name: "ClassSync",
              description: "Fee Payment",
              handler: async (response: {
                razorpay_payment_id: string;
                razorpay_order_id: string;
                razorpay_signature: string;
              }) => {
                try {
                  await captureRazorpayPaymentAction(
                    order.paymentId,
                    response.razorpay_order_id,
                    response.razorpay_payment_id,
                    response.razorpay_signature,
                  );
                  setPaymentSuccessFlag();
                  window.location.replace("/parent/fees");
                } catch {
                  toast({
                    variant: "destructive",
                    title: "Payment verification failed",
                    description:
                      "If the amount was deducted, contact the school.",
                  });
                }
              },
            });
            rzp.open();
          } else {
            toast({
              variant: "destructive",
              title: "Razorpay unavailable",
              description: "Please configure payment keys or try another method.",
            });
          }
          break;

        case "STRIPE":
          if (order.url) {
            window.location.href = order.url;
          }
          break;

        case "PHONEPE":
          if (order.redirectUrl) {
            window.location.href = order.redirectUrl;
          }
          break;

        case "PAYPAL":
          setPaypalContainer(invoiceId);
          setTimeout(() => renderPayPalButtons(invoiceId, order.orderId, order.publicKey, order.paymentId), 100);
          break;
      }
    } finally {
      setLoading(null);
    }
  }

  function renderPayPalButtons(
    invoiceId: string,
    orderId: string,
    clientId: string,
    paymentId: string,
  ) {
    const container = document.getElementById(`paypal-${invoiceId}`);
    if (!container || !window.paypal) return;

    container.innerHTML = "";
    window.paypal.Buttons({
      createOrder: () => orderId,
      onApprove: async () => {
        await capturePayPalPaymentAction(paymentId, orderId);
        setPaymentSuccessFlag();
        window.location.replace("/parent/fees");
      },
    }).render(container);

    if (!document.querySelector('script[src*="paypal.com/sdk/js"]')) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=INR`;
      script.async = true;
      script.onload = () => renderPayPalButtons(invoiceId, orderId, clientId, paymentId);
      document.body.appendChild(script);
    }
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-text-2">No invoices found.</p>;
  }

  return (
    <div className="space-y-4">
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      {!hasProviders && (
        <p className="glass-panel rounded-[var(--radius-md)] p-3 text-sm text-text-2">
          Your school has not configured any payment gateways yet. Please contact the school admin.
        </p>
      )}

      {hasProviders && providers.length > 1 && (
        <div className="max-w-xs">
          <label className="mb-1 block text-sm font-medium">Payment method</label>
          <Select
            value={selectedProvider}
            onValueChange={(v) => setSelectedProvider(v as PaymentProvider)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.provider} value={p.provider}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {invoices.map((inv) => {
        const remaining = Number(inv.amount) - Number(inv.paidAmount);
        return (
          <Card key={inv.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{inv.feeStructure.name}</p>
                <p className="text-sm text-text-2">{inv.student.name}</p>
                <p className="text-sm">₹{inv.amount} · {inv.status}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {remaining > 0 && inv.status !== "PAID" && (
                  <Button
                    size="sm"
                    onClick={() => handlePay(inv.id)}
                    disabled={loading === inv.id || !hasProviders}
                  >
                    {loading === inv.id ? "Processing..." : `Pay ₹${remaining}`}
                  </Button>
                )}
                {paypalContainer === inv.id && (
                  <div id={`paypal-${inv.id}`} className="min-w-[200px]" />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
