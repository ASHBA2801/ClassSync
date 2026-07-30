import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function setTenantContext(
  tx: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  schoolId: string,
  bypassRls = false,
) {
  if (bypassRls) {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'true', true)`;
    return;
  }
  await tx.$executeRaw`SELECT set_config('app.current_school_id', ${schoolId}, true)`;
}

export async function withTenantContext<T>(
  schoolId: string,
  fn: (tx: PrismaClient) => Promise<T>,
  bypassRls = false,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setTenantContext(tx, schoolId, bypassRls);
    return fn(tx as unknown as PrismaClient);
  });
}

export async function withSystemAdminContext<T>(
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return withTenantContext("", fn, true);
}
