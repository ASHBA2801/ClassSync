"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/rbac/guard";
import { createAuditLog } from "@/lib/audit";

interface WorkerHealth {
  up: boolean;
  latencyMs?: number;
  error?: string;
}

async function checkWorkerHealth(): Promise<WorkerHealth> {
  const url = process.env.WORKER_URL;
  if (!url) return { up: false, error: "WORKER_URL not configured" };

  const started = Date.now();
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { up: false, error: `HTTP ${res.status}` };
    return { up: true, latencyMs: Date.now() - started };
  } catch (err) {
    return { up: false, error: err instanceof Error ? err.message : String(err) };
  }
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

  const workerHealth = await checkWorkerHealth();

  return {
    schoolCount,
    activeSchools,
    escalatedAttendance,
    failedPayments,
    failedNotifications,
    workerHealth,
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
