import { withTenantContext } from "@/lib/db/prisma";
import type { PaymentProvider } from "@prisma/client";
import { activateSchoolPlan } from "@/lib/billing/subscription";

export async function completePayment(params: {
  schoolId: string;
  externalOrderId: string;
  externalPaymentId: string;
  paidAmount: number;
  provider: PaymentProvider;
}): Promise<{ completed: boolean; duplicate?: boolean; kind?: "fee" | "core" }> {
  return withTenantContext(params.schoolId, async (tx) => {
    const payment = await tx.payment.findFirst({
      where: {
        externalOrderId: params.externalOrderId,
        schoolId: params.schoolId,
        provider: params.provider,
      },
      include: { feeInvoice: true },
    });

    if (payment) {
      if (payment.status === "SUCCESS") {
        return { completed: true, duplicate: true, kind: "fee" };
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

      return { completed: true, kind: "fee" };
    }

    const coreInvoice = await tx.coreModuleInvoice.findFirst({
      where: {
        externalOrderId: params.externalOrderId,
        schoolId: params.schoolId,
        provider: params.provider,
      },
      include: { plan: true },
    });

    if (!coreInvoice) {
      return { completed: false };
    }

    if (coreInvoice.status === "PAID") {
      return { completed: true, duplicate: true, kind: "core" };
    }

    await tx.coreModuleInvoice.update({
      where: { id: coreInvoice.id },
      data: {
        status: "PAID",
        externalPaymentId: params.externalPaymentId,
        paidAt: new Date(),
      },
    });

    await activateSchoolPlan(tx, params.schoolId, coreInvoice.plan);

    return { completed: true, kind: "core" };
  });
}
