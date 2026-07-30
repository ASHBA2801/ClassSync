import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  actorId: string;
  action: string;
  schoolId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      schoolId: params.schoolId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
