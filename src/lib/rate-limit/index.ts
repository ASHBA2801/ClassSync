import { getRedis } from "@/lib/redis";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  return { allowed: current <= limit, remaining: Math.max(0, limit - current) };
}

export async function isDuplicate(key: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.set(key, "1", "EX", ttlSeconds, "NX");
  return result === null;
}

export async function acquireIdempotencyKey(key: string, ttlSeconds = 86400): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.set(`idempotency:${key}`, "1", "EX", ttlSeconds, "NX");
  return result === "OK";
}
