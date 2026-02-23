import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeakArea {
  area: string;
  lessonId?: string;
  lessonTitle?: string;
  score: number;
  threshold: number;
  gap: number;
}

interface Recommendation {
  type: "REVIEW" | "PRACTICE" | "MENTOR_SESSION" | "SUPPLEMENTAL";
  title: string;
  description: string;
  lessonId?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface CompetencyItem {
  competencyName: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: "MASTERED" | "PROFICIENT" | "DEVELOPING" | "NEEDS_IMPROVEMENT";
}

// ---------------------------------------------------------------------------
// Improvement plan generation (the "I" in L-D-V-I)
// ---------------------------------------------------------------------------

/**
 * Analyze weak areas from quiz attempts, verification results, and task
 * performance, then generate a personalized improvement plan.
 */
export async function generateImprovementPlan(
  userId: string,
  courseId: string
) {
  // Gather data for analysis
  const [quizAttempts, verifications, tasks, enrollment] = await Promise.all([
    // All quiz attempts for lessons in this course
    prisma.quizAttempt.findMany({
      where: {
        userId,
        lesson: { module: { courseId } },
      },
      include: {
        lesson: {
          include: {
            translations: true,
            module: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Verification records for this user in this course context
    prisma.verificationRecord.findMany({
      where: {
        userId,
        entityType: { in: ["Lesson", "Task", "MissionSubmission"] },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Tasks for lessons in this course
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        lesson: { module: { courseId } },
      },
      include: {
        lesson: {
          include: { translations: true },
        },
      },
    }),

    // Course enrollment
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }),
  ]);

  if (!enrollment) {
    throw new ApiError("User is not enrolled in this course", 404);
  }

  // ---------------------------------------------------------------------------
  // Identify weak areas
  // ---------------------------------------------------------------------------

  const weakAreas: WeakArea[] = [];
  const PASS_THRESHOLD = 80;

  // Analyze quiz performance per lesson
  const lessonQuizMap = new Map<
    string,
    { scores: number[]; lessonTitle: string }
  >();

  for (const attempt of quizAttempts) {
    const key = attempt.lessonId;
    if (!lessonQuizMap.has(key)) {
      lessonQuizMap.set(key, {
        scores: [],
        lessonTitle: attempt.lesson.translations[0]?.title ?? "Unknown",
      });
    }
    lessonQuizMap.get(key)!.scores.push(attempt.score);
  }

  for (const [lessonId, data] of lessonQuizMap) {
    const bestScore = Math.max(...data.scores);
    if (bestScore < PASS_THRESHOLD) {
      weakAreas.push({
        area: `Quiz: ${data.lessonTitle}`,
        lessonId,
        lessonTitle: data.lessonTitle,
        score: bestScore,
        threshold: PASS_THRESHOLD,
        gap: PASS_THRESHOLD - bestScore,
      });
    }
  }

  // Analyze task rejections
  const rejectedTasks = tasks.filter((t) => t.status === "REJECTED");
  for (const task of rejectedTasks) {
    const lessonTitle =
      task.lesson?.translations[0]?.title ?? "Practical task";
    weakAreas.push({
      area: `Task: ${task.title}`,
      lessonId: task.lessonId ?? undefined,
      lessonTitle,
      score: 0,
      threshold: 100,
      gap: 100,
    });
  }

  // Analyze failed verifications
  const failedVerifications = verifications.filter(
    (v) => v.result === "FAIL"
  );
  for (const v of failedVerifications) {
    weakAreas.push({
      area: `Verification (${v.type}): ${v.entityType} ${v.entityId}`,
      score: v.aiConfidence ? v.aiConfidence * 100 : 0,
      threshold: 85,
      gap: 85 - (v.aiConfidence ? v.aiConfidence * 100 : 0),
    });
  }

  // Sort by gap size (biggest gaps first)
  weakAreas.sort((a, b) => b.gap - a.gap);

  // ---------------------------------------------------------------------------
  // Generate recommendations
  // ---------------------------------------------------------------------------

  const recommendations: Recommendation[] = [];

  for (const weak of weakAreas) {
    if (weak.gap > 40) {
      // Large gap: recommend review + mentor session
      recommendations.push({
        type: "REVIEW",
        title: `Review: ${weak.lessonTitle ?? weak.area}`,
        description: `Score ${weak.score.toFixed(0)}% is significantly below ${weak.threshold}%. Review the lesson material thoroughly before retaking the assessment.`,
        lessonId: weak.lessonId,
        priority: "HIGH",
      });
      recommendations.push({
        type: "MENTOR_SESSION",
        title: `Mentor session: ${weak.lessonTitle ?? weak.area}`,
        description: `Request a mentor session to discuss areas of difficulty.`,
        lessonId: weak.lessonId,
        priority: "HIGH",
      });
    } else if (weak.gap > 15) {
      // Medium gap: recommend practice
      recommendations.push({
        type: "PRACTICE",
        title: `Practice: ${weak.lessonTitle ?? weak.area}`,
        description: `Score ${weak.score.toFixed(0)}% is close to passing. Additional practice should help you reach ${weak.threshold}%.`,
        lessonId: weak.lessonId,
        priority: "MEDIUM",
      });
    } else {
      // Small gap: recommend supplemental
      recommendations.push({
        type: "SUPPLEMENTAL",
        title: `Supplement: ${weak.lessonTitle ?? weak.area}`,
        description: `Minor gap (${weak.gap.toFixed(0)}%). Quick review of key concepts should suffice.`,
        lessonId: weak.lessonId,
        priority: "LOW",
      });
    }
  }

  // Determine supplemental lessons (lessons the user hasn't attempted yet)
  const allLessons = await prisma.lesson.findMany({
    where: {
      module: { courseId },
      isRequired: true,
      deletedAt: null,
    },
    include: { translations: true },
    orderBy: { orderIndex: "asc" },
  });

  const attemptedLessonIds = new Set(quizAttempts.map((a) => a.lessonId));
  const supplementLessons = allLessons
    .filter((l) => !attemptedLessonIds.has(l.id))
    .map((l) => ({
      lessonId: l.id,
      title: l.translations[0]?.title ?? `Lesson ${l.orderIndex + 1}`,
      reason: "Not yet attempted",
    }));

  // ---------------------------------------------------------------------------
  // Persist the improvement plan
  // ---------------------------------------------------------------------------

  const plan = await prisma.improvementPlan.create({
    data: {
      userId,
      weakAreas: weakAreas as unknown as Prisma.InputJsonValue,
      recommendations: recommendations as unknown as Prisma.InputJsonValue,
      supplementLessons: supplementLessons as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    ...plan,
    weakAreas,
    recommendations,
    supplementLessons,
  };
}

/**
 * Get the most recent improvement plan for a user.
 */
export async function getImprovementPlan(userId: string) {
  const plan = await prisma.improvementPlan.findFirst({
    where: { userId, isCompleted: false },
    orderBy: { createdAt: "desc" },
  });

  if (!plan) {
    return null;
  }

  return {
    ...plan,
    weakAreas: plan.weakAreas as unknown as WeakArea[],
    recommendations: plan.recommendations as unknown as Recommendation[],
    supplementLessons: plan.supplementLessons as unknown as Array<{
      lessonId: string;
      title: string;
      reason: string;
    }> | null,
  };
}

// ---------------------------------------------------------------------------
// Competency assessment
// ---------------------------------------------------------------------------

/**
 * Get the most recent competency assessment for a user in a course.
 */
export async function getCompetencyAssessment(
  userId: string,
  courseId: string
) {
  const assessment = await prisma.competencyAssessment.findFirst({
    where: { userId, courseId },
    orderBy: { assessedAt: "desc" },
  });

  if (!assessment) {
    return null;
  }

  return {
    ...assessment,
    competencies: assessment.competencies as unknown as CompetencyItem[],
  };
}

/**
 * Calculate a competency assessment from all available progress data.
 */
export async function createCompetencyAssessment(
  userId: string,
  courseId: string
) {
  // Get all modules and lessons for the course
  const modules = await prisma.module.findMany({
    where: { courseId, deletedAt: null },
    include: {
      translations: true,
      lessons: {
        where: { deletedAt: null, isRequired: true },
        include: {
          translations: true,
          progress: { where: { userId } },
          quizAttempts: {
            where: { userId },
            orderBy: { score: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  // Get task performance
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      lesson: { module: { courseId } },
    },
  });

  const competencies: CompetencyItem[] = modules.map((module) => {
    const moduleName =
      module.translations[0]?.title ?? `Module ${module.orderIndex + 1}`;

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const lesson of module.lessons) {
      // Lesson completion: 40 points
      const progress = lesson.progress[0];
      totalPoints += 40;
      if (progress?.status === "COMPLETED") {
        earnedPoints += 40;
      } else if (progress?.status === "IN_PROGRESS") {
        earnedPoints += 15;
      }

      // Quiz performance: 40 points
      const bestQuiz = lesson.quizAttempts[0];
      totalPoints += 40;
      if (bestQuiz) {
        earnedPoints += Math.round((bestQuiz.score / 100) * 40);
      }

      // Task completion: 20 points
      const lessonTasks = tasks.filter((t) => t.lessonId === lesson.id);
      if (lessonTasks.length > 0) {
        totalPoints += 20;
        const verifiedTasks = lessonTasks.filter(
          (t) => t.status === "VERIFIED"
        );
        earnedPoints += Math.round(
          (verifiedTasks.length / lessonTasks.length) * 20
        );
      }
    }

    const percentage =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    let status: CompetencyItem["status"];
    if (percentage >= 90) status = "MASTERED";
    else if (percentage >= 70) status = "PROFICIENT";
    else if (percentage >= 50) status = "DEVELOPING";
    else status = "NEEDS_IMPROVEMENT";

    return {
      competencyName: moduleName,
      score: earnedPoints,
      maxScore: totalPoints,
      percentage,
      status,
    };
  });

  const overallScore =
    competencies.length > 0
      ? Math.round(
          competencies.reduce((sum, c) => sum + c.percentage, 0) /
            competencies.length
        )
      : 0;

  const assessment = await prisma.competencyAssessment.create({
    data: {
      userId,
      courseId,
      competencies: competencies as unknown as Prisma.InputJsonValue,
      overallScore,
      assessedAt: new Date(),
    },
  });

  return {
    ...assessment,
    competencies,
  };
}
