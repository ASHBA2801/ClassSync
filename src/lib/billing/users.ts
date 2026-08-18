import type { PrismaClient } from "@prisma/client";

const BILLABLE_ROLES = ["SCHOOL_ADMIN", "TEACHER", "STAFF", "PARENT"] as const;

/** Distinct active login users on a school. Students are not accounts and do not count. */
export async function countBillableUsers(
  db: PrismaClient,
  schoolId: string,
): Promise<number> {
  const grouped = await db.userSchoolMembership.groupBy({
    by: ["userId"],
    where: {
      schoolId,
      isActive: true,
      role: { in: [...BILLABLE_ROLES] },
    },
  });
  return grouped.length;
}

export function periodEndFrom(start: Date, interval = "YEAR"): Date {
  const end = new Date(start.getTime());
  if (interval === "MONTH") {
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  }
  return end;
}

export function isSubscriptionCurrent(
  subscription: { status: string; currentPeriodEnd: Date } | null,
  now = new Date(),
): boolean {
  if (!subscription || subscription.status !== "ACTIVE") return false;
  return subscription.currentPeriodEnd.getTime() > now.getTime();
}
