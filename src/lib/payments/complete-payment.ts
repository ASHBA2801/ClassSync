import { withTenantContext } from "@/lib/db/prisma";
import type { PaymentProvider } from "@prisma/client";

export async function completePayment(params: {
  schoolId: string;
  externalOrderId: string;
  externalPaymentId: string;
  paidAmount: number;
  provider: PaymentProvider;
}): Promise<{ completed: boolean; duplicate?: boolean }> {
  return withTenantContext(params.schoolId, async (tx) => {
    const payment = await tx.payment.findFirst({
      where: {
        externalOrderId: params.externalOrderId,
        schoolId: params.schoolId,
        provider: params.provider,
      },
      include: { feeInvoice: true },
    });

    if (!payment) {
      return { completed: false };
    }

    if (payment.status === "SUCCESS") {
      return { completed: true, duplicate: true };
    }

    const invoice = payment.feeInvoice;
    const newPaid = Number(invoice.paidAmount) + params.paidAmount;
    const total = Number(invoice.amount);

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        externalPaymentId: params.externalPaymentId,
      },
    });
    await tx.feeInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        status: newPaid >= total ? "PAID" : "PARTIALLY_PAID",
      },
    });

    return { completed: true };
  });
}
