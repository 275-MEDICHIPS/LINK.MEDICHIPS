import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getLeaderboard } from "@/lib/services/gamification.service";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const orgId = payload.orgId;
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "ORGANIZATION";
    const timeRange = searchParams.get("timeRange") || "ALL_TIME";

    // For now, all scopes use org-based leaderboard
    // timeRange filtering can be added later via XP ledger date filters
    const targetOrgId = scope === "GLOBAL" ? orgId : orgId;

    const leaderboard = await getLeaderboard(targetOrgId, 50);

    // Get streak data for each user
    const userIds = leaderboard.map((e) => e.userId);
    const streaks = await prisma.streak.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, currentStreak: true },
    });
    const streakMap = new Map(
      streaks.map((s) => [s.userId, s.currentStreak])
    );

    const entries = leaderboard.map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      totalXp: entry.totalXp,
      level: entry.level,
      rank: entry.rank,
      streak: streakMap.get(entry.userId) ?? 0,
      isCurrentUser: entry.userId === userId,
    }));

    const currentUserRank =
      entries.find((e) => e.isCurrentUser)?.rank ?? null;

    return success({
      entries,
      currentUserRank,
      currentUserId: userId,
    });
  } catch (error) {
    return handleError(error);
  }
}
