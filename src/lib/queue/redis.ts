import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    globalForRedis.redis = new Redis(url, { maxRetriesPerRequest: null });
  }
  return globalForRedis.redis;
}

export const QUEUE_NAMES = {
  ATTENDANCE_FACE: "attendance-face-verification",
  NOTIFICATIONS: "notifications",
  SCHEDULER: "scheduler",
  SCHEDULE_REMINDERS: "schedule-reminders",
} as const;
