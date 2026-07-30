import webpush from "web-push";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getNotificationsQueue } from "@/lib/queue/queues";

export interface NotificationPayload {
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@classsync.app";
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }
}

export async function enqueueNotification(payload: NotificationPayload) {
  const queue = getNotificationsQueue();
  await queue.add("send", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function sendNotification(payload: NotificationPayload) {
  const log = await prisma.notificationLog.create({
    data: {
      schoolId: payload.schoolId,
      userId: payload.userId,
      channel: "WEB_PUSH",
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      status: "PENDING",
    },
  });

  try {
    configureWebPush();
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: payload.userId, schoolId: payload.schoolId },
    });

    for (const sub of subscriptions) {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title: payload.title, body: payload.body, data: payload.metadata }),
      );
    }

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT" },
    });
  } catch {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED" },
    });
  }
}

export async function notifyLinkedGuardians(
  schoolId: string,
  studentId: string,
  title: string,
  body: string,
) {
  const guardians = await prisma.guardianRelationship.findMany({
    where: { studentId, schoolId },
  });

  for (const g of guardians) {
    await enqueueNotification({ schoolId, userId: g.parentId, title, body, metadata: { studentId } });
  }
}
