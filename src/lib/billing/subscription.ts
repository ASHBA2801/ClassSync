import type { CorePricingPlan, PrismaClient } from "@prisma/client";
import { periodEndFrom } from "./users";

export async function activateSchoolPlan(
  tx: PrismaClient,
  schoolId: string,
  plan: Pick<CorePricingPlan, "id" | "maxUsers" | "interval">,
  now = new Date(),
) {
  const periodStart = now;
  const periodEnd = periodEndFrom(periodStart, plan.interval);

  return tx.schoolSubscription.upsert({
    where: { schoolId },
    create: {
      schoolId,
      planId: plan.id,
      status: "ACTIVE",
      userLimit: plan.maxUsers,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      userLimit: plan.maxUsers,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });
}
