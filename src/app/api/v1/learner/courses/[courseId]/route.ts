import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_LOCALE = "ko";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const { courseId } = await params;

    // Fetch course with creator and all nested data
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      include: {
        translations: { where: { locale: DEFAULT_LOCALE } },
        specialtyTags: { include: { specialty: true } },
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            creatorTitle: true,
            creatorBio: true,
            creatorField: true,
          },
        },
        modules: {
          where: { deletedAt: null },
          orderBy: { orderIndex: "asc" },
          include: {
            translations: { where: { locale: DEFAULT_LOCALE } },
            lessons: {
              where: { deletedAt: null },
              orderBy: { orderIndex: "asc" },
              include: {
                translations: { where: { locale: DEFAULT_LOCALE } },
                videoJobs: {
                  where: { status: "COMPLETED" },
                  select: { thumbnailUrl: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
      });
    }

    // Check enrollment
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    // Get lesson progress for all lessons
    const allLessonIds = course.modules.flatMap((m) =>
      m.lessons.map((l) => l.id)
    );
    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: allLessonIds } },
      select: { lessonId: true, status: true },
    });
    const progressMap = new Map(
      lessonProgresses.map((lp) => [lp.lessonId, lp.status])
    );

    // Determine unlock status per lesson
    const lessonUnlockMap = new Map<string, boolean>();
    for (const mod of course.modules) {
      for (let i = 0; i < mod.lessons.length; i++) {
        const lesson = mod.lessons[i];
        if (i === 0) {
          lessonUnlockMap.set(lesson.id, true);
        } else {
          const prevLesson = mod.lessons[i - 1];
          const prevStatus = progressMap.get(prevLesson.id);
          lessonUnlockMap.set(
            lesson.id,
            prevStatus === "COMPLETED" || !prevLesson.isRequired
          );
        }
      }
    }

    // Find continue lesson (first incomplete unlocked lesson)
    let continueLesson: { moduleId: string; lessonId: string } | null = null;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        const status = progressMap.get(lesson.id);
        if (
          status !== "COMPLETED" &&
          lessonUnlockMap.get(lesson.id)
        ) {
          continueLesson = { moduleId: mod.id, lessonId: lesson.id };
          break;
        }
      }
      if (continueLesson) break;
    }

    const courseT = course.translations[0];

    // Content breakdown
    let videoCount = 0;
    let totalDurationMin = 0;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (lesson.contentType === "VIDEO" || lesson.contentType === "MIXED") {
          videoCount++;
        }
        totalDurationMin += lesson.durationMin ?? 0;
      }
    }

    // Creator course count and enrollment count
    let creatorCourseCount = 0;
    let creatorEnrollmentCount = 0;
    if (course.creator) {
      const creatorStats = await prisma.course.findMany({
        where: { creatorId: course.creator.id, status: "PUBLISHED", deletedAt: null },
        select: { _count: { select: { enrollments: true } } },
      });
      creatorCourseCount = creatorStats.length;
      creatorEnrollmentCount = creatorStats.reduce(
        (sum, c) => sum + c._count.enrollments,
        0
      );
    }

    const modules = course.modules.map((mod) => {
      const modT = mod.translations[0];
      const lessons = mod.lessons.map((lesson) => {
        const lessonT = lesson.translations[0];
        return {
          id: lesson.id,
          orderIndex: lesson.orderIndex,
          contentType: lesson.contentType,
          durationMin: lesson.durationMin,
          isRequired: lesson.isRequired,
          title: lessonT?.title ?? "Untitled",
          description: lessonT?.description ?? null,
          thumbnailUrl: lesson.videoJobs[0]?.thumbnailUrl ?? null,
          isCompleted: progressMap.get(lesson.id) === "COMPLETED",
          isUnlocked: lessonUnlockMap.get(lesson.id) ?? false,
        };
      });

      return {
        id: mod.id,
        orderIndex: mod.orderIndex,
        title: modT?.title ?? "Untitled",
        description: modT?.description ?? null,
        lessons,
        completedLessons: lessons.filter((l) => l.isCompleted).length,
        totalLessons: lessons.length,
      };
    });

    const progressPct = enrollment?.progressPct ?? 0;

    return success({
      id: course.id,
      slug: course.slug,
      riskLevel: course.riskLevel,
      thumbnailUrl: course.thumbnailUrl,
      estimatedHours: course.estimatedHours,
      title: courseT?.title ?? "Untitled",
      description: courseT?.description ?? null,
      specialties: course.specialtyTags.map((st) => ({
        id: st.specialty.id,
        name: st.specialty.name,
      })),
      creator: course.creator
        ? {
            id: course.creator.id,
            name: course.creator.name,
            avatarUrl: course.creator.avatarUrl,
            creatorTitle: course.creator.creatorTitle,
            creatorBio: course.creator.creatorBio,
            creatorField: course.creator.creatorField,
            courseCount: creatorCourseCount,
            enrollmentCount: creatorEnrollmentCount,
          }
        : null,
      contentBreakdown: { videoCount, totalDurationMin },
      modules,
      progressPct,
      isEnrolled: !!enrollment,
      continueLesson,
    });
  } catch (error) {
    return handleError(error);
  }
}
