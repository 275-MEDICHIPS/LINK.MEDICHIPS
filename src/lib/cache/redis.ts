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

// ==================== Key Patterns ====================

export const CACHE_KEYS = {
  leaderboard: (orgId: string) => `lb:${orgId}`,
  userXp: (userId: string) => `xp:${userId}`,
  courseProgress: (userId: string, courseId: string) =>
    `progress:${userId}:${courseId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  rateLimitPin: (identifier: string) => `rl:pin:${identifier}`,
  loginAttempts: (identifier: string) => `login:attempts:${identifier}`,
  apiCache: (key: string) => `cache:api:${key}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
  analytics: (orgId: string, type: string) => `analytics:${orgId}:${type}`,
} as const;

// ==================== Cache Helpers ====================

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error("[Redis] Cache set error:", err);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("[Redis] Cache delete error:", err);
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error("[Redis] Pattern invalidation error:", err);
  }
}

// ==================== Leaderboard ====================

export async function updateLeaderboard(
  scope: string,
  userId: string,
  xp: number
): Promise<void> {
  try {
    await redis.zadd(CACHE_KEYS.leaderboard(scope), xp, userId);
  } catch (err) {
    console.error("[Redis] Leaderboard update error:", err);
  }
}

export async function getLeaderboardTop(
  scope: string,
  count = 50
): Promise<Array<{ userId: string; xp: number }>> {
  try {
    const results = await redis.zrevrange(
      CACHE_KEYS.leaderboard(scope),
      0,
      count - 1,
      "WITHSCORES"
    );

    const entries: Array<{ userId: string; xp: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({ userId: results[i], xp: parseInt(results[i + 1]) });
    }
    return entries;
  } catch {
    return [];
  }
}

export async function getUserRank(
  scope: string,
  userId: string
): Promise<number | null> {
  try {
    const rank = await redis.zrevrank(CACHE_KEYS.leaderboard(scope), userId);
    return rank !== null ? rank + 1 : null;
  } catch {
    return null;
  }
}

// ==================== Rate Limiting ====================

export async function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests = 100,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const key = CACHE_KEYS.rateLimit(ip, endpoint);
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
    };
  } catch {
    return { allowed: true, remaining: maxRequests };
  }
}

// ==================== Login Attempts ====================

export async function recordLoginAttempt(identifier: string): Promise<number> {
  const key = CACHE_KEYS.loginAttempts(identifier);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 900); // 15 min window
  }
  return count;
}

export async function getLoginAttempts(identifier: string): Promise<number> {
  const count = await redis.get(CACHE_KEYS.loginAttempts(identifier));
  return count ? parseInt(count) : 0;
}

export async function clearLoginAttempts(identifier: string): Promise<void> {
  await redis.del(CACHE_KEYS.loginAttempts(identifier));
}
