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

    // Streak
    const streak = await prisma.streak.findFirst({
      where: { userId },
    });

    // Continue learning — with creator info
    let continueLearning = null;
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { userId, completedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        course: {
          include: {
            translations: true,
            creator: {
              select: { name: true, avatarUrl: true, creatorTitle: true },
            },
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
          creator: enrollment.course.creator
            ? {
                name: enrollment.course.creator.name,
                avatarUrl: enrollment.course.creator.avatarUrl,
                creatorTitle: enrollment.course.creator.creatorTitle,
              }
            : null,
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

    // Pending tasks (max 2 for compact dashboard)
    const rawTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      orderBy: { dueDate: "asc" },
      take: 2,
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

    // Recommended courses (up to 6) — with creator info
    const enrolledCourseIds = await prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const enrolledIds = enrolledCourseIds.map((e) => e.courseId);

    const recommendedRaw = await prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(enrolledIds.length > 0 ? { id: { notIn: enrolledIds } } : {}),
      },
      include: {
        translations: true,
        modules: {
          where: { deletedAt: null },
          include: {
            lessons: {
              where: { deletedAt: null },
              select: { id: true, contentType: true },
            },
          },
        },
        creator: {
          select: { name: true, avatarUrl: true, creatorTitle: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    const recommendedCourses = recommendedRaw.map((course) => {
      const courseT = getTranslation(course.translations);
      const videoCount = course.modules.reduce(
        (sum, m) =>
          sum +
          m.lessons.filter(
            (l) => l.contentType === "VIDEO" || l.contentType === "MIXED"
          ).length,
        0
      );
      return {
        id: course.id,
        title: courseT?.title ?? "Untitled",
        thumbnailUrl: course.thumbnailUrl,
        riskLevel: course.riskLevel,
        videoCount,
        creator: course.creator
          ? {
              name: course.creator.name,
              avatarUrl: course.creator.avatarUrl,
              creatorTitle: course.creator.creatorTitle,
            }
          : null,
      };
    });

    return success({
      user: { name: user.name, avatarUrl: user.avatarUrl },
      totalXp,
      level,
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
      },
      continueLearning,
      dailyGoal,
      pendingTasks,
      recommendedCourses,
    });
  } catch (error) {
    return handleError(error);
  }
}

function buildEmptyDashboard(name: string) {
  return {
    user: { name, avatarUrl: null },
    totalXp: 0,
    level: 1,
    streak: { currentStreak: 0 },
    continueLearning: null,
    dailyGoal: { targetMin: 15, completedMin: 0, lessonsToday: 0 },
    pendingTasks: [],
    recommendedCourses: [],
  };
}
