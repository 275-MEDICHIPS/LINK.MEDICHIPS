import { prisma } from "@/lib/db/prisma";
import { cacheGet, cacheSet, cacheDelete, CACHE_KEYS } from "@/lib/cache/redis";
import type { XpActionType } from "@prisma/client";

// ==================== XP AMOUNTS ====================

export const XP_AMOUNTS: Record<XpActionType, number> = {
  LESSON_COMPLETE: 20,
  QUIZ_PASS: 30,
  MISSION_SUBMIT: 15,
  MISSION_APPROVED: 25,
  STREAK_BONUS: 10,
  BADGE_EARNED: 50,
  TASK_COMPLETE: 20,
  PEER_HELP: 10,
  DAILY_LOGIN: 5,
};

// ==================== LEVEL THRESHOLDS ====================

// Levels: 1(0), 2(100), 3(300), 4(600), 5(1000), 6(1500), 7(2100), 8(2800)...
// Formula: threshold(n) = threshold(n-1) + n*100 for n >= 2
const LEVEL_THRESHOLDS: number[] = (() => {
  const thresholds = [0]; // Level 1 starts at 0
  let cumulative = 0;
  for (let level = 2; level <= 50; level++) {
    cumulative += level * 100 - 100;
    thresholds.push(cumulative);
  }
  return thresholds;
})();

const LEADERBOARD_TTL = 900; // 15 minutes

// ==================== XP EVENT SOURCING ====================

/**
 * Award XP to a user using append-only ledger with idempotency.
 * Returns the created ledger entry or null if duplicate key.
 */
export async function awardXp(
  userId: string,
  action: XpActionType,
  amount: number,
  entityType?: string,
  entityId?: string,
  idempotencyKey?: string
) {
  const key = idempotencyKey ?? `${userId}:${action}:${entityType ?? ""}:${entityId ?? ""}:${Date.now()}`;

  // Check for existing entry with same idempotency key
  const existing = await prisma.xpLedger.findUnique({
    where: { idempotencyKey: key },
  });

  if (existing) {
    return existing; // Already awarded, return existing entry
  }

  const entry = await prisma.xpLedger.create({
    data: {
      userId,
      action,
      amount,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      idempotencyKey: key,
    },
  });

  // Invalidate cached XP total
  await cacheDelete(CACHE_KEYS.userXp(userId));

  return entry;
}

/**
 * Get total XP for a user, cached in Redis.
 */
export async function getTotalXp(userId: string): Promise<number> {
  const cached = await cacheGet<number>(CACHE_KEYS.userXp(userId));
  if (cached !== null) return cached;

  const result = await prisma.xpLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  const total = result._sum.amount ?? 0;
  await cacheSet(CACHE_KEYS.userXp(userId), total, 600); // 10 min cache
  return total;
}

/**
 * Get recent XP events for a user.
 */
export async function getXpHistory(userId: string, limit = 20) {
  return prisma.xpLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ==================== LEVEL CALCULATION ====================

/**
 * Calculate level from total XP.
 */
export function getLevel(totalXp: number): {
  level: number;
  currentXp: number;
  nextLevelXp: number | null;
  progress: number;
} {
  let level = 1;

  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

  const xpInLevel = totalXp - currentThreshold;
  const xpForNextLevel = nextThreshold !== null ? nextThreshold - currentThreshold : null;
  const progress = xpForNextLevel !== null ? Math.min(xpInLevel / xpForNextLevel, 1) : 1;

  return {
    level,
    currentXp: totalXp,
    nextLevelXp: nextThreshold,
    progress: Math.round(progress * 100) / 100,
  };
}

// ==================== BADGES ====================

interface BadgeCriteria {
  type: string;
  threshold: number;
}

/**
 * Evaluate all badge criteria and award earned badges.
 * Returns newly awarded badges.
 */
export async function checkAndAwardBadges(userId: string) {
  const allBadges = await prisma.badgeDefinition.findMany();
  const earnedBadges = await prisma.earnedBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  });
  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId));

  const newBadges: Array<{ badgeId: string; name: string }> = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    const criteria = badge.criteria as unknown as BadgeCriteria;
    const earned = await evaluateBadgeCriteria(userId, criteria);

    if (earned) {
      await prisma.earnedBadge.create({
        data: { userId, badgeId: badge.id },
      });

      // Award bonus XP for earning a badge
      if (badge.xpReward > 0) {
        await awardXp(
          userId,
          "BADGE_EARNED",
          badge.xpReward,
          "badge",
          badge.id,
          `badge:${userId}:${badge.id}`
        );
      }

      newBadges.push({ badgeId: badge.id, name: badge.name });
    }
  }

  return newBadges;
}

/**
 * Evaluate a single badge criterion against user data.
 */
async function evaluateBadgeCriteria(
  userId: string,
  criteria: BadgeCriteria
): Promise<boolean> {
  switch (criteria.type) {
    case "lessons_completed": {
      const count = await prisma.lessonProgress.count({
        where: { userId, status: "COMPLETED" },
      });
      return count >= criteria.threshold;
    }
    case "quizzes_passed": {
      const count = await prisma.quizAttempt.count({
        where: { userId, passed: true },
      });
      return count >= criteria.threshold;
    }
    case "missions_approved": {
      const count = await prisma.missionSubmission.count({
        where: { userId, status: "APPROVED" },
      });
      return count >= criteria.threshold;
    }
    case "total_xp": {
      const total = await getTotalXp(userId);
      return total >= criteria.threshold;
    }
    case "streak_days": {
      const streak = await getStreak(userId);
      return streak.currentStreak >= criteria.threshold;
    }
    case "tasks_completed": {
      const count = await prisma.task.count({
        where: { assigneeId: userId, status: "VERIFIED" },
      });
      return count >= criteria.threshold;
    }
    case "courses_completed": {
      const count = await prisma.courseEnrollment.count({
        where: { userId, completedAt: { not: null } },
      });
      return count >= criteria.threshold;
    }
    case "certificates_earned": {
      const count = await prisma.issuedCertificate.count({
        where: { userId, revokedAt: null },
      });
      return count >= criteria.threshold;
    }
    default:
      return false;
  }
}

// ==================== STREAKS ====================

/**
 * Update daily activity streak for a user.
 * FIX: Uses streakFreezes to avoid penalizing users in low-connectivity areas.
 */
export async function updateStreak(userId: string) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let streak = await prisma.streak.findUnique({
    where: { userId },
  });

  if (!streak) {
    streak = await prisma.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: now,
        streakFreezes: 2,
      },
    });
    return streak;
  }

  const lastDateStr = streak.lastActivityDate
    ? streak.lastActivityDate.toISOString().slice(0, 10)
    : null;

  // Already logged activity today
  if (lastDateStr === todayStr) {
    return streak;
  }

  // Calculate days since last activity
  const daysSinceLast = lastDateStr
    ? Math.floor(
        (new Date(todayStr).getTime() - new Date(lastDateStr).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  let newStreak = streak.currentStreak;
  let newFreezes = streak.streakFreezes;

  if (daysSinceLast === 1) {
    // Consecutive day - increment streak
    newStreak += 1;
  } else if (daysSinceLast > 1) {
    // Missed day(s) - check if streak freezes can cover the gap
    const missedDays = daysSinceLast - 1;
    if (missedDays <= newFreezes) {
      // FIX: Use streak freezes to preserve streak for low-connectivity users
      newFreezes -= missedDays;
      newStreak += 1; // Continue streak as if no gap
    } else {
      // Not enough freezes - reset streak
      newStreak = 1;
      // Don't consume freezes on reset
    }
  } else if (!lastDateStr) {
    // First activity ever
    newStreak = 1;
  }

  const newLongest = Math.max(streak.longestStreak, newStreak);

  const updated = await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActivityDate: now,
      streakFreezes: newFreezes,
    },
  });

  // Award streak bonus XP every 7 consecutive days
  if (newStreak > 0 && newStreak % 7 === 0) {
    await awardXp(
      userId,
      "STREAK_BONUS",
      XP_AMOUNTS.STREAK_BONUS,
      "streak",
      streak.id,
      `streak:${userId}:${newStreak}`
    );
  }

  return updated;
}

/**
 * Get current streak data for a user.
 */
export async function getStreak(userId: string) {
  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      streakFreezes: 2,
    };
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActivityDate: streak.lastActivityDate,
    streakFreezes: streak.streakFreezes,
  };
}

// ==================== LEADERBOARD ====================

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  rank: number;
}

/**
 * Get org-scoped leaderboard, cached and refreshed every 15 minutes.
 */
export async function getLeaderboard(
  orgId: string,
  limit = 50
): Promise<LeaderboardEntry[]> {
  const cacheKey = CACHE_KEYS.leaderboard(orgId);
  const cached = await cacheGet<LeaderboardEntry[]>(cacheKey);
  if (cached) return cached.slice(0, limit);

  // Build materialized leaderboard from XP ledger
  const results = await prisma.$queryRaw<
    Array<{ userId: string; name: string; avatarUrl: string | null; totalXp: bigint }>
  >`
    SELECT
      u.id AS "userId",
      u.name,
      u."avatarUrl",
      COALESCE(SUM(xl.amount), 0) AS "totalXp"
    FROM users u
    INNER JOIN organization_memberships om ON om."userId" = u.id
    LEFT JOIN xp_ledger xl ON xl."userId" = u.id
    WHERE om."organizationId" = ${orgId}
      AND om."isActive" = true
      AND u."isActive" = true
      AND u."deletedAt" IS NULL
    GROUP BY u.id, u.name, u."avatarUrl"
    ORDER BY "totalXp" DESC
    LIMIT 100
  `;

  const leaderboard: LeaderboardEntry[] = results.map((row, index) => {
    const xp = Number(row.totalXp);
    return {
      userId: row.userId,
      name: row.name,
      avatarUrl: row.avatarUrl,
      totalXp: xp,
      level: getLevel(xp).level,
      rank: index + 1,
    };
  });

  await cacheSet(cacheKey, leaderboard, LEADERBOARD_TTL);
  return leaderboard.slice(0, limit);
}

// ==================== GAMIFICATION PROFILE ====================

export interface GamificationProfile {
  totalXp: number;
  level: ReturnType<typeof getLevel>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    category: string;
    earnedAt: Date;
  }>;
  streak: Awaited<ReturnType<typeof getStreak>>;
  rank: number | null;
}

/**
 * Get full gamification profile for a user.
 */
export async function getGamificationProfile(
  userId: string,
  orgId?: string
): Promise<GamificationProfile> {
  const [totalXp, streak, earnedBadges] = await Promise.all([
    getTotalXp(userId),
    getStreak(userId),
    prisma.earnedBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const level = getLevel(totalXp);

  const badges = earnedBadges.map((eb) => ({
    id: eb.badge.id,
    name: eb.badge.name,
    description: eb.badge.description,
    iconUrl: eb.badge.iconUrl,
    category: eb.badge.category,
    earnedAt: eb.earnedAt,
  }));

  // Determine rank within org
  let rank: number | null = null;
  if (orgId) {
    const leaderboard = await getLeaderboard(orgId, 100);
    const entry = leaderboard.find((e) => e.userId === userId);
    rank = entry?.rank ?? null;
  }

  return {
    totalXp,
    level,
    badges,
    streak,
    rank,
  };
}

/**
 * Get all badge definitions with earned status for a user.
 */
export async function getAllBadgesWithStatus(userId: string) {
  const [allBadges, earnedBadges] = await Promise.all([
    prisma.badgeDefinition.findMany({ orderBy: { category: "asc" } }),
    prisma.earnedBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    }),
  ]);

  const earnedMap = new Map(
    earnedBadges.map((eb) => [eb.badgeId, eb.earnedAt])
  );

  return allBadges.map((badge) => ({
    id: badge.id,
    slug: badge.slug,
    name: badge.name,
    description: badge.description,
    iconUrl: badge.iconUrl,
    category: badge.category,
    criteria: badge.criteria,
    xpReward: badge.xpReward,
    earned: earnedMap.has(badge.id),
    earnedAt: earnedMap.get(badge.id) ?? null,
  }));
}
