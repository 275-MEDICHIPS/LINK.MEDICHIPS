import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getLesson } from "@/lib/services/course.service";
import { getLessonProgress, isLessonUnlocked } from "@/lib/services/progress.service";
import { getQuiz, getQuizAttempts } from "@/lib/services/quiz.service";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";

const DEFAULT_LOCALE = "en";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const { courseId, moduleId, lessonId } = await params;

    // Check if lesson is unlocked
    const unlocked = await isLessonUnlocked(userId, lessonId);
    if (!unlocked) {
      throw new ApiError("Lesson is locked. Complete previous lessons first.", 403, "LESSON_LOCKED");
    }

    const lesson = await getLesson(lessonId, DEFAULT_LOCALE);
    const progress = await getLessonProgress(userId, lessonId);

    // Get published content body
    const publishedVersion = lesson.versions[0];
    const body = (publishedVersion?.body as Record<string, unknown>) ?? {};

    // Get module and course titles
    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { translations: { where: { locale: DEFAULT_LOCALE } } },
    });
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { translations: { where: { locale: DEFAULT_LOCALE } } },
    });

    // Navigation: get all lessons in the module
    const moduleLessons = await prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
      orderBy: { orderIndex: "asc" },
      include: { translations: { where: { locale: DEFAULT_LOCALE } } },
    });

    const currentIndex = moduleLessons.findIndex((l) => l.id === lessonId);
    const prevLesson = currentIndex > 0 ? moduleLessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex < moduleLessons.length - 1
        ? moduleLessons[currentIndex + 1]
        : null;

    // Get quiz data if applicable
    let quiz = null;
    if (lesson.contentType === "QUIZ" || lesson.contentType === "MIXED") {
      try {
        const quizData = await getQuiz(lessonId, DEFAULT_LOCALE);
        const attempts = await getQuizAttempts(userId, lessonId);
        quiz = {
          id: lessonId,
          questions: quizData.questions.map((q) => ({
            id: q.id,
            question: q.prompt,
            options: (q.options ?? []).map((opt, i) => ({
              id: `${q.id}_opt_${i}`,
              text: opt,
            })),
            type: q.type === "TRUE_FALSE" ? "single" : "single",
          })),
          passingScore: quizData.passingScore,
          attemptsAllowed: 3,
          attemptsUsed: attempts.length,
        };
      } catch {
        // Quiz might not exist for this lesson
      }
    }

    // Extract key points from body
    const keyPoints = Array.isArray(body.keyPoints) ? body.keyPoints as string[] : [];

    const lessonT = lesson.translations[0];

    return success({
      id: lesson.id,
      courseId,
      courseTitle: course?.translations[0]?.title ?? "Untitled",
      moduleId,
      moduleTitle: mod?.translations[0]?.title ?? "Untitled",
      orderIndex: lesson.orderIndex,
      contentType: lesson.contentType,
      durationMin: lesson.durationMin,
      title: lessonT?.title ?? "Untitled",
      description: lessonT?.description ?? null,
      isRequired: lesson.isRequired,
      body: {
        videoUrl: body.videoUrl as string | undefined,
        videoPlaybackId: body.videoPlaybackId as string | undefined,
        audioUrl: body.audioUrl as string | undefined,
        markdownContent: body.markdownContent as string | undefined,
        htmlContent: body.htmlContent as string | undefined,
        notes: body.notes as string | undefined,
      },
      progress: progress
        ? {
            status: progress.status,
            score: progress.score,
            timeSpentSec: progress.timeSpentSec,
            lastPosition: progress.lastPosition,
          }
        : null,
      navigation: {
        previousLesson: prevLesson
          ? {
              id: prevLesson.id,
              title: prevLesson.translations[0]?.title ?? "Untitled",
              moduleId,
            }
          : null,
        nextLesson: nextLesson
          ? {
              id: nextLesson.id,
              title: nextLesson.translations[0]?.title ?? "Untitled",
              moduleId,
            }
          : null,
        currentIndex,
        totalInModule: moduleLessons.length,
      },
      keyPoints,
      quiz,
    });
  } catch (error) {
    return handleError(error);
  }
}
