"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/rbac/guard";
import { encrypt } from "@/lib/encryption";
import { createAuditLog } from "@/lib/audit";
import { getRedis, QUEUE_NAMES } from "@/lib/queue/redis";

const aiKeySchema = z.object({
  provider: z.string(),
  key: z.string(),
  schoolId: z.string().uuid().optional(),
});

export async function saveAIServiceKeyAction(input: z.infer<typeof aiKeySchema>) {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);
  const data = aiKeySchema.parse(input);

  const record = await prisma.aIServiceKey.create({
    data: {
      provider: data.provider,
      keyEncrypted: encrypt(data.key),
      schoolId: data.schoolId,
    },
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "ai.key_create",
    schoolId: data.schoolId,
    entityType: "AIServiceKey",
    entityId: record.id,
    metadata: { provider: data.provider },
  });

  return record;
}

export async function listAIServiceKeysAction() {
  await requireRole(["SYSTEM_ADMIN"]);
  return prisma.aIServiceKey.findMany({
    where: { isActive: true },
    include: { school: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function searchGlobalUsersAction(query: string) {
  const ctx = await requireRole(["SYSTEM_ADMIN"]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    include: { memberships: { include: { school: true } } },
    take: 50,
  });

  await createAuditLog({
    actorId: ctx.userId,
    action: "system.user_search",
    metadata: { query, resultCount: users.length },
  });

  return users;
}

export async function getPlatformMonitoringAction() {
  await requireRole(["SYSTEM_ADMIN"]);

  const [
    schoolCount,
    activeSchools,
    escalatedAttendance,
    failedPayments,
    failedNotifications,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: "ACTIVE" } }),
    prisma.teacherAttendance.count({ where: { status: "ESCALATED" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.notificationLog.count({ where: { status: "FAILED" } }),
  ]);

  let queueHealth: Record<string, number> = {};
  try {
    const redis = getRedis();
    for (const name of Object.values(QUEUE_NAMES)) {
      const waiting = await redis.llen(`bull:${name}:wait`);
      const failed = await redis.llen(`bull:${name}:failed`);
      queueHealth[name] = waiting + failed;
    }
  } catch {
    queueHealth = { error: -1 };
  }

  return {
    schoolCount,
    activeSchools,
    escalatedAttendance,
    failedPayments,
    failedNotifications,
    queueHealth,
  };
}

export async function listAuditLogsAction(limit = 100) {
  await requireRole(["SYSTEM_ADMIN"]);
  return prisma.auditLog.findMany({
    include: { actor: true, school: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getSchoolBillingOverviewAction() {
  await requireRole(["SYSTEM_ADMIN"]);
  return prisma.school.findMany({
    select: {
      id: true,
      name: true,
      planTier: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          memberships: true,
          students: true,
          payments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
