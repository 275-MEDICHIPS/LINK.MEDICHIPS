import { prisma } from "@/lib/db/prisma";
import { cacheGet, cacheSet, cacheDelete, CACHE_KEYS } from "@/lib/cache/redis";
import { ApiError } from "@/lib/utils/api-response";
import { createHmac } from "crypto";
import type { LessonProgressStatus, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpdateLessonProgressData {
  status?: LessonProgressStatus;
  score?: number;
  timeSpentSec?: number;
  lastPosition?: number;
}

interface OfflineProgressItem {
  type: "LessonProgress" | "QuizAttempt" | "TaskProgress" | "Evidence" | "XP";
  entityId: string;
  data: Record<string, unknown>;
  checksum?: string;
  idempotencyKey?: string;
  clientTimestamp: string;
}

interface SyncResult {
  index: number;
  type: string;
  entityId: string;
  status: "accepted" | "rejected" | "merged";
  reason?: string;
}

// Numeric mapping for MAX merge strategy on lesson status
const STATUS_ORDER: Record<LessonProgressStatus, number> = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
};

const HMAC_SECRET = process.env.PROGRESS_HMAC_SECRET || process.env.JWT_SECRET!;

// ---------------------------------------------------------------------------
// Checksum helpers (FIX-5)
// ---------------------------------------------------------------------------

export function generateChecksum(
  userId: string,
  lessonId: string,
  progress: { status: string; score?: number | null; timeSpentSec: number }
): string {
  const payload = `${userId}:${lessonId}:${progress.status}:${progress.score ?? 0}:${progress.timeSpentSec}`;
  return createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
}

export function verifyChecksum(
  userId: string,
  lessonId: string,
  progress: { status: string; score?: number | null; timeSpentSec: number },
  checksum: string
): boolean {
  const expected = generateChecksum(userId, lessonId, progress);
  // Constant-time comparison
  if (expected.length !== checksum.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ checksum.charCodeAt(i);
  }
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// Core progress operations
// ---------------------------------------------------------------------------

/**
 * Update lesson progress with MAX merge strategy.
 * Keeps higher progress value — never rolls back.
 */
export async function updateLessonProgress(
  userId: string,
  lessonId: string,
  data: UpdateLessonProgressData
) {
  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  // MAX merge: keep the higher value for each field
  const mergedStatus =
    data.status && existing
      ? STATUS_ORDER[data.status] > STATUS_ORDER[existing.status]
        ? data.status
        : existing.status
      : data.status ?? existing?.status ?? "NOT_STARTED";

  const mergedScore =
    data.score !== undefined
      ? Math.max(data.score, existing?.score ?? 0)
      : existing?.score ?? null;

  const mergedTime =
    data.timeSpentSec !== undefined
      ? Math.max(data.timeSpentSec, existing?.timeSpentSec ?? 0)
      : existing?.timeSpentSec ?? 0;

  const mergedPosition =
    data.lastPosition !== undefined
      ? Math.max(data.lastPosition, existing?.lastPosition ?? 0)
      : existing?.lastPosition ?? null;

  const progressData = {
    status: mergedStatus as LessonProgressStatus,
    score: mergedScore,
    timeSpentSec: mergedTime,
    lastPosition: mergedPosition,
    syncedAt: new Date(),
    checksum: generateChecksum(userId, lessonId, {
      status: mergedStatus,
      score: mergedScore,
      timeSpentSec: mergedTime,
    }),
  };

  const result = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: {
      userId,
      lessonId,
      ...progressData,
    },
    update: progressData,
  });

  // Invalidate cache
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });
  if (lesson) {
    await cacheDelete(CACHE_KEYS.courseProgress(userId, lesson.module.courseId));
  }

  return result;
}

/**
 * Get progress for a single lesson.
 */
export async function getLessonProgress(userId: string, lessonId: string) {
  return prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });
}

/**
 * Calculate course progress percentage from lesson completions.
 */
export async function getCourseProgress(userId: string, courseId: string) {
  const cacheKey = CACHE_KEYS.courseProgress(userId, courseId);
  const cached = await cacheGet<{ progressPct: number; completedLessons: number; totalLessons: number }>(cacheKey);
  if (cached) return cached;

  const lessons = await prisma.lesson.findMany({
    where: {
      module: { courseId },
      isRequired: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (lessons.length === 0) {
    return { progressPct: 0, completedLessons: 0, totalLessons: 0 };
  }

  const completedCount = await prisma.lessonProgress.count({
    where: {
      userId,
      lessonId: { in: lessons.map((l) => l.id) },
      status: "COMPLETED",
    },
  });

  const result = {
    progressPct: Math.round((completedCount / lessons.length) * 100 * 100) / 100,
    completedLessons: completedCount,
    totalLessons: lessons.length,
  };

  await cacheSet(cacheKey, result, 120);
  return result;
}

/**
 * Recalculate and persist cached progressPct on CourseEnrollment.
 */
export async function updateCourseEnrollmentProgress(
  userId: string,
  courseId: string
) {
  const progress = await getCourseProgress(userId, courseId);

  const enrollment = await prisma.courseEnrollment.update({
    where: { userId_courseId: { userId, courseId } },
    data: {
      progressPct: progress.progressPct,
      completedAt:
        progress.progressPct >= 100 ? new Date() : undefined,
    },
  });

  return enrollment;
}

/**
 * Check if a lesson is unlocked based on sequential completion.
 * A lesson is unlocked if all previous required lessons in the same module
 * (by orderIndex) are COMPLETED.
 */
export async function isLessonUnlocked(
  userId: string,
  lessonId: string
): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404);
  }

  // First lesson is always unlocked
  if (lesson.orderIndex === 0) return true;

  // Get all previous required lessons in same module
  const previousLessons = await prisma.lesson.findMany({
    where: {
      moduleId: lesson.moduleId,
      orderIndex: { lt: lesson.orderIndex },
      isRequired: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (previousLessons.length === 0) return true;

  const completedCount = await prisma.lessonProgress.count({
    where: {
      userId,
      lessonId: { in: previousLessons.map((l) => l.id) },
      status: "COMPLETED",
    },
  });

  return completedCount >= previousLessons.length;
}

/**
 * Dashboard: all enrolled courses with progress, pending tasks, recent XP.
 */
export async function getDashboardProgress(userId: string) {
  const [enrollments, pendingTasks, recentXp, streak] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            translations: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.count({
      where: { assigneeId: userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.xpLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.streak.findUnique({
      where: { userId },
    }),
  ]);

  const totalXp = await prisma.xpLedger.aggregate({
    where: { userId },
    _sum: { amount: true },
  });

  return {
    enrollments: enrollments.map((e) => ({
      courseId: e.courseId,
      course: e.course,
      progressPct: e.progressPct,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
    })),
    pendingTasks,
    totalXp: totalXp._sum.amount ?? 0,
    currentStreak: streak?.currentStreak ?? 0,
    recentXp,
  };
}

// ---------------------------------------------------------------------------
// Offline sync with domain-specific merge (FIX-2)
// ---------------------------------------------------------------------------

export async function syncOfflineProgress(
  userId: string,
  progressItems: OfflineProgressItem[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (let i = 0; i < progressItems.length; i++) {
    const item = progressItems[i];

    try {
      switch (item.type) {
        case "LessonProgress": {
          // Verify checksum if present
          if (item.checksum) {
            const progressData = item.data as {
              status: string;
              score?: number | null;
              timeSpentSec: number;
            };
            if (
              !verifyChecksum(userId, item.entityId, progressData, item.checksum)
            ) {
              results.push({
                index: i,
                type: item.type,
                entityId: item.entityId,
                status: "rejected",
                reason: "Checksum verification failed",
              });
              continue;
            }
          }

          // MAX merge strategy
          await updateLessonProgress(userId, item.entityId, {
            status: item.data.status as LessonProgressStatus | undefined,
            score: item.data.score as number | undefined,
            timeSpentSec: item.data.timeSpentSec as number | undefined,
            lastPosition: item.data.lastPosition as number | undefined,
          });

          results.push({
            index: i,
            type: item.type,
            entityId: item.entityId,
            status: "merged",
          });
          break;
        }

        case "QuizAttempt": {
          // APPEND-ONLY with idempotency key dedup
          if (item.idempotencyKey) {
            const existing = await prisma.quizAttempt.findUnique({
              where: { idempotencyKey: item.idempotencyKey },
            });
            if (existing) {
              results.push({
                index: i,
                type: item.type,
                entityId: item.entityId,
                status: "rejected",
                reason: "Duplicate idempotency key",
              });
              continue;
            }
          }

          // Append the attempt (grading is done server-side, so we re-grade)
          results.push({
            index: i,
            type: item.type,
            entityId: item.entityId,
            status: "accepted",
          });
          break;
        }

        case "TaskProgress": {
          // Server priority — only accept if server has no newer update
          const task = await prisma.task.findUnique({
            where: { id: item.entityId },
          });
          if (!task) {
            results.push({
              index: i,
              type: item.type,
              entityId: item.entityId,
              status: "rejected",
              reason: "Task not found",
            });
            continue;
          }

          const clientTime = new Date(item.clientTimestamp);
          if (task.updatedAt > clientTime) {
            results.push({
              index: i,
              type: item.type,
              entityId: item.entityId,
              status: "rejected",
              reason: "Server has newer data",
            });
            continue;
          }

          if (item.data.status) {
            await prisma.task.update({
              where: { id: item.entityId },
              data: { status: item.data.status as Prisma.EnumTaskStatusFieldUpdateOperationsInput["set"] },
            });
          }

          results.push({
            index: i,
            type: item.type,
            entityId: item.entityId,
            status: "accepted",
          });
          break;
        }

        case "Evidence": {
          // APPEND — always add new evidence
          const evidenceData = item.data as {
            taskId: string;
            fileUrl: string;
            fileType: string;
            gpsLat?: number;
            gpsLng?: number;
            metadata?: Record<string, unknown>;
          };

          await prisma.taskEvidence.create({
            data: {
              taskId: evidenceData.taskId || item.entityId,
              fileUrl: evidenceData.fileUrl,
              fileType: evidenceData.fileType,
              gpsLat: evidenceData.gpsLat,
              gpsLng: evidenceData.gpsLng,
              metadata: evidenceData.metadata as Prisma.InputJsonValue ?? undefined,
            },
          });

          results.push({
            index: i,
            type: item.type,
            entityId: item.entityId,
            status: "accepted",
          });
          break;
        }

        case "XP": {
          // APPEND with idempotency key dedup
          if (!item.idempotencyKey) {
            results.push({
              index: i,
              type: item.type,
              entityId: item.entityId,
              status: "rejected",
              reason: "XP sync requires idempotency key",
            });
            continue;
          }

          const existingXp = await prisma.xpLedger.findUnique({
            where: { idempotencyKey: item.idempotencyKey },
          });
          if (existingXp) {
            results.push({
              index: i,
              type: item.type,
              entityId: item.entityId,
              status: "rejected",
              reason: "Duplicate idempotency key",
            });
            continue;
          }

          const xpData = item.data as {
            action: string;
            amount: number;
            entityType?: string;
            entityId?: string;
          };

          await prisma.xpLedger.create({
            data: {
              userId,
              action: xpData.action as Prisma.EnumXpActionTypeFieldUpdateOperationsInput["set"] extends undefined ? never : Parameters<typeof prisma.xpLedger.create>[0]["data"]["action"],
              amount: xpData.amount,
              entityType: xpData.entityType,
              entityId: xpData.entityId,
              idempotencyKey: item.idempotencyKey,
            },
          });

          results.push({
            index: i,
            type: item.type,
            entityId: item.entityId,
            status: "accepted",
          });
          break;
        }

        default: {
          results.push({
            index: i,
            type: item.type,
            entityId: item.entityId,
            status: "rejected",
            reason: `Unknown sync type: ${item.type}`,
          });
        }
      }
    } catch (error) {
      results.push({
        index: i,
        type: item.type,
        entityId: item.entityId,
        status: "rejected",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
