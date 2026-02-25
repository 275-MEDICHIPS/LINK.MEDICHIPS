import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import { nanoid } from "nanoid";
import type { VideoProductionStatus } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface UpsertVideoSettingsInput {
  avatarId?: string | null;
  voicePresetId?: string | null;
  speakerName?: string | null;
  visualStyle?: string | null;
  targetLocale?: string;
  additionalInstructions?: string | null;
}

export interface CourseVideoStatusResult {
  courseId: string;
  totalLessons: number;
  videoLessons: number;
  stats: {
    noVideo: number;
    generating: number;
    review: number;
    completed: number;
  };
  lessons: Array<{
    lessonId: string;
    lessonTitle: string;
    moduleTitle: string;
    contentType: string;
    latestJob?: {
      id: string;
      status: string;
      thumbnailUrl?: string | null;
      muxPlaybackId?: string | null;
    };
  }>;
}

// ─── Status groups ──────────────────────────────────────────────────

const GENERATING_STATUSES: VideoProductionStatus[] = [
  "DRAFT",
  "SCRIPT_GENERATING",
  "QUEUED",
  "RENDERING",
  "FACE_SWAPPING",
  "POST_PROCESSING",
];

const REVIEW_STATUSES: VideoProductionStatus[] = [
  "SCRIPT_REVIEW",
  "REVIEW",
];

// ─── Service functions ──────────────────────────────────────────────

export async function getCourseVideoSettings(courseId: string) {
  const settings = await prisma.courseVideoSettings.findUnique({
    where: { courseId },
  });
  return settings;
}

export async function upsertCourseVideoSettings(
  courseId: string,
  data: UpsertVideoSettingsInput
) {
  // Verify course exists
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  const settings = await prisma.courseVideoSettings.upsert({
    where: { courseId },
    create: {
      courseId,
      avatarId: data.avatarId ?? undefined,
      voicePresetId: data.voicePresetId ?? undefined,
      speakerName: data.speakerName ?? undefined,
      visualStyle: data.visualStyle ?? undefined,
      targetLocale: data.targetLocale ?? "en",
      additionalInstructions: data.additionalInstructions ?? undefined,
    },
    update: {
      ...(data.avatarId !== undefined && { avatarId: data.avatarId }),
      ...(data.voicePresetId !== undefined && {
        voicePresetId: data.voicePresetId,
      }),
      ...(data.speakerName !== undefined && {
        speakerName: data.speakerName,
      }),
      ...(data.visualStyle !== undefined && {
        visualStyle: data.visualStyle,
      }),
      ...(data.targetLocale !== undefined && {
        targetLocale: data.targetLocale,
      }),
      ...(data.additionalInstructions !== undefined && {
        additionalInstructions: data.additionalInstructions,
      }),
    },
  });

  return settings;
}

export async function getCourseVideoStatus(
  courseId: string,
  locale = "en"
): Promise<CourseVideoStatusResult> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: {
      modules: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
        include: {
          translations: { where: { locale } },
          lessons: {
            where: { deletedAt: null },
            orderBy: { orderIndex: "asc" },
            include: {
              translations: { where: { locale } },
              videoJobs: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      lesson: l,
      moduleTitle: m.translations[0]?.title ?? "Untitled Module",
    }))
  );

  let noVideo = 0;
  let generating = 0;
  let review = 0;
  let completed = 0;

  const lessons = allLessons.map(({ lesson, moduleTitle }) => {
    const latestJob = lesson.videoJobs[0];

    if (!latestJob) {
      noVideo++;
    } else if (latestJob.status === "COMPLETED") {
      completed++;
    } else if (REVIEW_STATUSES.includes(latestJob.status)) {
      review++;
    } else if (GENERATING_STATUSES.includes(latestJob.status)) {
      generating++;
    } else {
      // FAILED, CANCELLED
      noVideo++;
    }

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.translations[0]?.title ?? "Untitled Lesson",
      moduleTitle,
      contentType: lesson.contentType,
      latestJob: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            thumbnailUrl: latestJob.thumbnailUrl,
            muxPlaybackId: latestJob.muxPlaybackId,
          }
        : undefined,
    };
  });

  return {
    courseId,
    totalLessons: allLessons.length,
    videoLessons: allLessons.filter((l) => l.lesson.contentType === "VIDEO")
      .length,
    stats: { noVideo, generating, review, completed },
    lessons,
  };
}

export async function getCourseLessonsForVideo(
  courseId: string,
  locale = "en"
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: {
      modules: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
        include: {
          translations: { where: { locale } },
          lessons: {
            where: { deletedAt: null },
            orderBy: { orderIndex: "asc" },
            include: {
              translations: { where: { locale } },
              videoJobs: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { id: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  return course.modules.flatMap((m) =>
    m.lessons.map((l) => ({
      lessonId: l.id,
      lessonTitle: l.translations[0]?.title ?? "Untitled",
      moduleTitle: m.translations[0]?.title ?? "Untitled Module",
      contentType: l.contentType,
      latestJobStatus: l.videoJobs[0]?.status ?? null,
      latestJobId: l.videoJobs[0]?.id ?? null,
    }))
  );
}

export async function batchCreateVideoJobs(
  courseId: string,
  lessonIds: string[],
  userId: string
) {
  // Get course video settings
  const settings = await prisma.courseVideoSettings.findUnique({
    where: { courseId },
  });

  // Verify all lessons belong to the course
  const lessons = await prisma.lesson.findMany({
    where: {
      id: { in: lessonIds },
      deletedAt: null,
      module: { courseId, deletedAt: null },
    },
    select: { id: true },
  });

  if (lessons.length !== lessonIds.length) {
    throw new ApiError(
      "Some lessons do not belong to this course",
      400,
      "INVALID_LESSONS"
    );
  }

  const batchId = `batch_${nanoid()}`;

  const jobs = await prisma.$transaction(
    lessonIds.map((lessonId) =>
      prisma.videoProductionJob.create({
        data: {
          method: "AI_GENERATED",
          provider: "VEO",
          status: "DRAFT",
          lessonId,
          courseId,
          batchId,
          avatarId: settings?.avatarId ?? undefined,
          voicePresetId: settings?.voicePresetId ?? undefined,
        },
      })
    )
  );

  // Create status history for each job
  await prisma.videoJobStatusHistory.createMany({
    data: jobs.map((job) => ({
      jobId: job.id,
      fromStatus: "DRAFT" as VideoProductionStatus,
      toStatus: "DRAFT" as VideoProductionStatus,
      triggeredBy: userId,
      metadata: { action: "batch_created", batchId },
    })),
  });

  return { batchId, jobIds: jobs.map((j) => j.id) };
}
