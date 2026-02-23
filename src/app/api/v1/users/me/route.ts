import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";

/**
 * GET: Return current user profile with organization membership and progress stats
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        preferredLocale: true,
        connectivityLevel: true,
        isActive: true,
        lastActiveAt: true,
        createdAt: true,
        memberships: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            joinedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            courseEnrollments: true,
            lessonProgress: { where: { status: "COMPLETED" } },
            quizAttempts: true,
            missionSubmissions: true,
            earnedBadges: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError("User not found", 404, "USER_NOT_FOUND");
    }

    // Fetch aggregated XP
    const xpAggregate = await prisma.xpLedger.aggregate({
      where: { userId: payload.sub },
      _sum: { amount: true },
    });

    // Fetch streak info
    const streak = await prisma.streak.findUnique({
      where: { userId: payload.sub },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
      },
    });

    return success({
      ...user,
      stats: {
        totalXp: xpAggregate._sum.amount || 0,
        coursesEnrolled: user._count.courseEnrollments,
        lessonsCompleted: user._count.lessonProgress,
        quizAttempts: user._count.quizAttempts,
        missionSubmissions: user._count.missionSubmissions,
        badgesEarned: user._count.earnedBadges,
        currentStreak: streak?.currentStreak || 0,
        longestStreak: streak?.longestStreak || 0,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AuthError"
    ) {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferredLocale: z
    .enum(["en", "ko", "km", "sw", "fr"])
    .optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

/**
 * PATCH: Update current user profile (name, locale, avatar)
 */
export async function PATCH(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const body = await req.json();
    const input = updateProfileSchema.parse(body);

    // Only update fields that were provided
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.preferredLocale !== undefined)
      updateData.preferredLocale = input.preferredLocale;
    if (input.avatarUrl !== undefined)
      updateData.avatarUrl = input.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(
        "No fields to update",
        400,
        "NO_UPDATE_FIELDS"
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        preferredLocale: true,
        connectivityLevel: true,
        updatedAt: true,
      },
      data: updateData,
    });

    return success(updatedUser);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AuthError"
    ) {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
