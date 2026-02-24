import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getAllBadgesWithStatus,
  getTotalXp,
  getLevel,
  getStreak,
  getLeaderboard,
} from "@/lib/services/gamification.service";
import { listUserCertificates } from "@/lib/services/certificate.service";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const orgId = payload.orgId;

    const [
      badges,
      totalXp,
      streak,
      certificates,
      user,
    ] = await Promise.all([
      getAllBadgesWithStatus(userId),
      getTotalXp(userId),
      getStreak(userId),
      listUserCertificates(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, avatarUrl: true },
      }),
    ]);

    const level = getLevel(totalXp);

    // Determine rank
    let rank: number | null = null;
    try {
      const leaderboard = await getLeaderboard(orgId, 100);
      const entry = leaderboard.find((e) => e.userId === userId);
      rank = entry?.rank ?? null;
    } catch {
      // Leaderboard might fail if org has no members
    }

    // Stats
    const [lessonsCompleted, quizzesPassed, tasksVerified, coursesCompleted] =
      await Promise.all([
        prisma.lessonProgress.count({
          where: { userId, status: "COMPLETED" },
        }),
        prisma.quizAttempt.count({
          where: { userId, passed: true },
        }),
        prisma.task.count({
          where: { assigneeId: userId, status: "VERIFIED" },
        }),
        prisma.courseEnrollment.count({
          where: { userId, completedAt: { not: null } },
        }),
      ]);

    return success({
      profile: {
        name: user?.name ?? "User",
        avatarUrl: user?.avatarUrl ?? null,
        totalXp,
        level,
        streak: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
        },
        rank,
      },
      badges: badges.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        iconUrl: b.iconUrl,
        category: b.category,
        earned: b.earned,
        earnedAt: b.earnedAt?.toISOString() ?? null,
        xpReward: b.xpReward,
      })),
      certificates: certificates.map((c) => ({
        id: c.id,
        issueNumber: c.issueNumber,
        courseName: c.courseName,
        templateName: c.templateName,
        pdfUrl: c.pdfUrl,
        issuedAt: c.issuedAt.toISOString(),
        isValid: c.isValid,
      })),
      stats: {
        lessonsCompleted,
        quizzesPassed,
        tasksVerified,
        coursesCompleted,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
