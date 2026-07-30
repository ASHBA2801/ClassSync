"use client";

import { useState } from "react";
import { createPaymentOrderAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Invoice {
  id: string;
  amount: { toString(): string };
  paidAmount: { toString(): string };
  status: string;
  student: { name: string };
  feeStructure: { name: string };
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function PaymentList({ invoices }: { invoices: Invoice[] }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePay(invoiceId: string) {
    setLoading(invoiceId);
    try {
      const order = await createPaymentOrderAction(invoiceId);

      if (typeof window !== "undefined" && window.Razorpay && order.keyId) {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "ClassSync",
          description: "Fee Payment",
        });
        rzp.open();
      } else {
        alert(`Order created: ${order.orderId}. Configure Razorpay keys to complete payment.`);
      }
    } finally {
      setLoading(null);
    }
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-zinc-500">No invoices found.</p>;
  }

  return (
    <div className="space-y-4">
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      {invoices.map((inv) => {
        const remaining = Number(inv.amount) - Number(inv.paidAmount);
        return (
          <Card key={inv.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{inv.feeStructure.name}</p>
                <p className="text-sm text-zinc-500">{inv.student.name}</p>
                <p className="text-sm">₹{inv.amount.toString()} · {inv.status}</p>
              </div>
              {remaining > 0 && inv.status !== "PAID" && (
                <Button
                  size="sm"
                  onClick={() => handlePay(inv.id)}
                  disabled={loading === inv.id}
                >
                  {loading === inv.id ? "Processing..." : `Pay ₹${remaining}`}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
