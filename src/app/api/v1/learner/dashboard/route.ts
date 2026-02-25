import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";

const DEFAULT_LOCALE = "ko";

function getTranslation<T extends { locale: string }>(
  translations: T[],
  locale = DEFAULT_LOCALE
): T | undefined {
  return translations.find((t) => t.locale === locale) || translations[0];
}

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatarUrl: true },
    });

    if (!user) {
      return success(buildEmptyDashboard("User"));
    }

    // XP total
    const xpAgg = await prisma.xpLedger.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const totalXp = xpAgg._sum.amount ?? 0;

    // Level calculation (100 XP per level)
    const XP_PER_LEVEL = 100;
    const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const progress = (totalXp % XP_PER_LEVEL) / XP_PER_LEVEL;

    // Streak
    const streak = await prisma.streak.findFirst({
      where: { userId },
    });

    // Continue learning
    let continueLearning = null;
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { userId, completedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        course: {
          include: {
            translations: true,
          },
        },
      },
    });

    if (enrollment) {
      const lessonProgress = await prisma.lessonProgress.findFirst({
        where: { userId, status: { not: "COMPLETED" } },
        orderBy: { updatedAt: "desc" },
        include: {
          lesson: {
            include: {
              translations: true,
              module: {
                select: { orderIndex: true },
              },
            },
          },
        },
      });

      if (lessonProgress) {
        const courseT = getTranslation(enrollment.course.translations);
        const lessonT = getTranslation(lessonProgress.lesson.translations);
        continueLearning = {
          courseId: enrollment.course.id,
          courseTitle: courseT?.title ?? "Untitled",
          lessonId: lessonProgress.lesson.id,
          lessonTitle: lessonT?.title ?? "Untitled",
          moduleId: lessonProgress.lesson.moduleId,
          progressPct: enrollment.progressPct,
          thumbnailUrl: enrollment.course.thumbnailUrl,
          moduleIndex: lessonProgress.lesson.module.orderIndex,
          lessonIndex: lessonProgress.lesson.orderIndex,
          durationMin: lessonProgress.lesson.durationMin,
          lastStudiedAt: enrollment.updatedAt.toISOString(),
        };
      }
    }

    // Daily goal
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCompletedLessons = await prisma.lessonProgress.findMany({
      where: {
        userId,
        status: "COMPLETED",
        updatedAt: { gte: todayStart },
      },
      include: {
        lesson: { select: { durationMin: true } },
      },
    });

    const completedMin = todayCompletedLessons.reduce(
      (sum, lp) => sum + (lp.lesson.durationMin ?? 0),
      0
    );

    const dailyGoal = {
      targetMin: 15,
      completedMin,
      lessonsToday: todayCompletedLessons.length,
    };

    // Pending tasks
    const rawTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        checklist: true,
      },
    });

    const pendingTasks = rawTasks.map((t) => {
      const items = Array.isArray(t.checklist)
        ? (t.checklist as Array<{ done?: boolean }>)
        : [];
      return {
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        checklistTotal: items.length,
        checklistDone: items.filter((i) => i.done).length,
      };
    });

    // Weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    const completedLessons = await prisma.lessonProgress.findMany({
      where: { userId, status: "COMPLETED", updatedAt: { gte: weekAgo } },
      select: { updatedAt: true },
    });

    const weeklyProgress = Array(7).fill(0) as number[];
    const today = new Date();
    for (const lp of completedLessons) {
      const dayDiff = Math.floor(
        (today.getTime() - lp.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const idx = 6 - dayDiff;
      if (idx >= 0 && idx < 7) weeklyProgress[idx]++;
    }

    // Recent badges
    const recentBadges = await prisma.earnedBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      take: 5,
      include: {
        badge: { select: { id: true, name: true, iconUrl: true } },
      },
    });

    // Recommended course
    const enrolledCourseIds = await prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const enrolledIds = enrolledCourseIds.map((e) => e.courseId);

    let recommendedCourse = null;
    const course = await prisma.course.findFirst({
      where: {
        status: "PUBLISHED",
        ...(enrolledIds.length > 0 ? { id: { notIn: enrolledIds } } : {}),
      },
      include: {
        translations: true,
        modules: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (course) {
      const courseT = getTranslation(course.translations);
      recommendedCourse = {
        id: course.id,
        title: courseT?.title ?? "Untitled",
        description: courseT?.description ?? "",
        thumbnailUrl: course.thumbnailUrl,
        moduleCount: course.modules.length,
        riskLevel: course.riskLevel,
      };
    }

    return success({
      user: { name: user.name, avatarUrl: user.avatarUrl },
      totalXp,
      level: {
        level,
        currentXp: totalXp,
        nextLevelXp: level * XP_PER_LEVEL,
        progress,
      },
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
      },
      continueLearning,
      dailyGoal,
      pendingTasks,
      weeklyProgress,
      recentBadges: recentBadges.map((eb) => ({
        id: eb.badge.id,
        name: eb.badge.name,
        iconUrl: eb.badge.iconUrl,
        earnedAt: eb.earnedAt.toISOString(),
      })),
      recommendedCourse,
    });
  } catch (error) {
    return handleError(error);
  }
}

function buildEmptyDashboard(name: string) {
  return {
    user: { name, avatarUrl: null },
    totalXp: 0,
    level: { level: 1, currentXp: 0, nextLevelXp: 100, progress: 0 },
    streak: { currentStreak: 0, longestStreak: 0 },
    continueLearning: null,
    dailyGoal: { targetMin: 15, completedMin: 0, lessonsToday: 0 },
    pendingTasks: [],
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
    recentBadges: [],
    recommendedCourse: null,
  };
}
