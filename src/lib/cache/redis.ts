import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Key patterns
export const CACHE_KEYS = {
  leaderboard: (orgId: string) => `lb:${orgId}`,
  userXp: (userId: string) => `xp:${userId}`,
  courseProgress: (userId: string, courseId: string) =>
    `progress:${userId}:${courseId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  rateLimitPin: (identifier: string) => `rl:pin:${identifier}`,
} as const;

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
  await redis.del(key);
}
