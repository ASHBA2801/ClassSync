"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  captureCoreModulePayPalAction,
  captureCoreModuleRazorpayAction,
  createCoreModulePaymentOrderAction,
} from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
    paypal?: {
      Buttons: (options: Record<string, unknown>) => { render: (el: HTMLElement) => void };
    };
  }
}

function formatInr(value: string) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function PlanCheckout({
  plans,
  providers,
  currentPlanId,
}: {
  plans: Array<{
    id: string;
    name: string;
    description: string | null;
    maxUsers: number;
    priceAmount: string;
    currency: string;
    interval: string;
  }>;
  providers: PublicProviderInfo[];
  currentPlanId: string | null;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<PaymentProvider>(providers[0]?.provider ?? "RAZORPAY");
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePay(planId: string) {
    setLoading(planId);
    try {
      const order = await createCoreModulePaymentOrderAction(planId, provider);
      if ("activated" in order && order.activated) {
        toast({ title: "Plan activated", description: "This plan has no charge." });
        router.refresh();
        return;
      }

      switch (order.provider) {
        case "RAZORPAY":
          if (typeof window !== "undefined" && window.Razorpay && "publicKey" in order && order.publicKey) {
            const rzp = new window.Razorpay({
              key: order.publicKey,
              amount: order.amount,
              currency: order.currency,
              order_id: order.orderId,
              name: "ClassSync",
              description: "Core module subscription",
              handler: async (response: {
                razorpay_payment_id: string;
                razorpay_order_id: string;
                razorpay_signature: string;
              }) => {
                try {
                  await captureCoreModuleRazorpayAction(
                    order.invoiceId,
                    response.razorpay_order_id,
                    response.razorpay_payment_id,
                    response.razorpay_signature,
                  );
                  toast({ title: "Payment successful", description: "Your core module plan is now active." });
                  router.refresh();
                } catch {
                  toast({
                    variant: "destructive",
                    title: "Payment verification failed",
                    description: "If the amount was deducted, contact ClassSync support.",
                  });
                }
              },
            });
            rzp.open();
          } else {
            toast({
              variant: "destructive",
              title: "Razorpay unavailable",
              description: "Configure Razorpay in Settings or choose another method.",
            });
          }
          break;
        case "STRIPE":
          if ("url" in order && order.url) window.location.href = order.url;
          break;
        case "PHONEPE":
          if ("redirectUrl" in order && order.redirectUrl) window.location.href = order.redirectUrl;
          break;
        case "PAYPAL":
          setTimeout(
            () =>
              renderPayPal(
                planId,
                "orderId" in order ? order.orderId : "",
                "publicKey" in order ? order.publicKey : "",
                order.invoiceId,
              ),
            100,
          );
          break;
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not start payment",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setLoading(null);
    }
  }

  function renderPayPal(planId: string, orderId: string, clientId: string, invoiceId: string) {
    const container = document.getElementById(`paypal-core-${planId}`);
    if (!container || !window.paypal) return;
    container.innerHTML = "";
    window.paypal
      .Buttons({
        createOrder: () => orderId,
        onApprove: async () => {
          await captureCoreModulePayPalAction(invoiceId, orderId);
          toast({ title: "Payment successful", description: "Your core module plan is now active." });
          router.refresh();
        },
      })
      .render(container);

    if (!document.querySelector('script[src*="paypal.com/sdk/js"]')) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=INR`;
      script.async = true;
      document.body.appendChild(script);
    }
  }

  return (
    <div className="space-y-4">
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      {providers.length > 0 ? (
        <div className="max-w-xs">
          <p className="text-sm text-text-2 mb-2">Payment method</p>
          <Select value={provider} onValueChange={(value) => setProvider(value as PaymentProvider)}>
            <SelectTrigger>
              <SelectValue />
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
      ) : (
        <p className="text-sm text-warning">
          No payment gateway is enabled. Open Settings and configure Razorpay, PhonePe, Stripe, or PayPal first.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const current = currentPlanId === plan.id;
          return (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{plan.name}</span>
                  {current ? <span className="text-xs font-medium text-success">Current</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-semibold text-text-1">
                  {formatInr(plan.priceAmount)}
                  <span className="ml-1 text-sm font-normal text-text-2">/ year</span>
                </p>
                <p className="text-sm text-text-2">Up to {plan.maxUsers} login users</p>
                {plan.description ? <p className="text-sm text-text-2">{plan.description}</p> : null}
                <div id={`paypal-core-${plan.id}`} />
                <Button
                  type="button"
                  disabled={!providers.length || loading === plan.id}
                  onClick={() => handlePay(plan.id)}
                >
                  {loading === plan.id ? "Starting..." : current ? "Renew" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
