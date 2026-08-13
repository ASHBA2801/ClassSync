import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

/** Shared Redis client — used for rate limiting and idempotency only. */
export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    globalForRedis.redis = new Redis(url, { maxRetriesPerRequest: null });
  }
  return globalForRedis.redis;
}
