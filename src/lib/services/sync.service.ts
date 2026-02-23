import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";
import type { LessonProgressStatus, XpActionType } from "@prisma/client";
import * as crypto from "crypto";

/**
 * Domain-specific merge strategies for offline sync.
 * FIX-2: NOT last-write-wins. Each domain has its own strategy.
 */

type SyncAction = {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  checksum?: string;
  idempotencyKey?: string;
};

type SyncResult = {
  accepted: number;
  rejected: number;
  conflicts: Array<{ action: SyncAction; reason: string }>;
};

export class SyncService {
  /**
   * Process a batch of offline sync actions.
   */
  async processSyncBatch(
    userId: string,
    deviceSecret: string,
    actions: SyncAction[]
  ): Promise<SyncResult> {
    const result: SyncResult = { accepted: 0, rejected: 0, conflicts: [] };

    for (const action of actions) {
      try {
        // Verify checksum if present (FIX-5)
        if (action.checksum && !this.verifyChecksum(action, userId, deviceSecret)) {
          result.rejected++;
          result.conflicts.push({ action, reason: "CHECKSUM_MISMATCH" });
          logger.warn("Sync checksum mismatch", { userId, actionType: action.type });
          continue;
        }

        switch (action.type) {
          case "LESSON_PROGRESS":
            await this.mergeLessonProgress(userId, action);
            break;
          case "QUIZ_ATTEMPT":
            await this.appendQuizAttempt(userId, action);
            break;
          case "TASK_EVIDENCE":
            await this.appendTaskEvidence(action);
            break;
          case "XP_EVENT":
            await this.appendXpEvent(userId, action);
            break;
          default:
            result.rejected++;
            result.conflicts.push({ action, reason: "UNKNOWN_ACTION_TYPE" });
            continue;
        }

        result.accepted++;
      } catch (error) {
        result.rejected++;
        result.conflicts.push({ action, reason: "PROCESSING_ERROR" });
        logger.error("Sync action failed", error, { userId, actionType: action.type });
      }
    }

    return result;
  }

  /**
   * LESSON_PROGRESS: MAX merge strategy.
   * Keep the higher progress value between server and client.
   */
  private async mergeLessonProgress(userId: string, action: SyncAction): Promise<void> {
    const { lessonId, status, score, timeSpentSec } = action.data as {
      lessonId: string;
      status: LessonProgressStatus;
      score: number;
      timeSpentSec: number;
    };

    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (!existing) {
      await prisma.lessonProgress.create({
        data: { userId, lessonId, status, score, timeSpentSec },
      });
      return;
    }

    // MAX strategy: keep higher values
    const statusPriority: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };
    const newStatusPriority = statusPriority[status] || 0;
    const existingStatusPriority = statusPriority[existing.status] || 0;

    await prisma.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId } },
      data: {
        status: newStatusPriority > existingStatusPriority ? status : existing.status,
        score: Math.max(score || 0, existing.score || 0),
        timeSpentSec: Math.max(timeSpentSec || 0, existing.timeSpentSec || 0),
      },
    });
  }

  /**
   * QUIZ_ATTEMPT: APPEND-ONLY strategy.
   * All attempts are preserved, MAX(score) for pass determination.
   */
  private async appendQuizAttempt(userId: string, action: SyncAction): Promise<void> {
    const { lessonId, answers } = action.data as {
      lessonId: string;
      answers: Record<string, unknown>;
    };

    // Note: Score is computed server-side, NOT from client data (FIX-5)
    // Client only submits answers, server scores them
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { versions: { where: { status: "PUBLISHED" }, take: 1 } },
    });

    if (!lesson?.versions[0]) return;

    const content = lesson.versions[0].body as Record<string, unknown>;
    const questions = (content.questions || []) as Array<Record<string, unknown>>;
    const passingScore = (content.passingScore as number) || 80;

    // Score on server
    let correct = 0;
    for (const q of questions) {
      const userAnswer = (answers as Record<string, Record<string, unknown>>)[q.id as string];
      if (userAnswer?.selected === q.correctAnswer) correct++;
    }

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    // Get next attempt number
    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: { userId, lessonId },
      orderBy: { attemptNumber: "desc" },
    });

    await prisma.quizAttempt.create({
      data: {
        userId,
        lessonId,
        score,
        passed: score >= passingScore,
        answers: JSON.parse(JSON.stringify(answers)),
        attemptNumber: (lastAttempt?.attemptNumber || 0) + 1,
        startedAt: new Date(action.timestamp),
        completedAt: new Date(),
        idempotencyKey: action.idempotencyKey,
      },
    });
  }

  /**
   * TASK_EVIDENCE: APPEND strategy.
   * All uploads are preserved.
   */
  private async appendTaskEvidence(action: SyncAction): Promise<void> {
    const { taskId, fileUrl, fileType, gpsLat, gpsLng, metadata } = action.data as {
      taskId: string;
      fileUrl: string;
      fileType: string;
      gpsLat?: number;
      gpsLng?: number;
      metadata?: Record<string, unknown>;
    };

    await prisma.taskEvidence.create({
      data: {
        taskId,
        fileUrl,
        fileType,
        gpsLat,
        gpsLng,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  }

  /**
   * XP_EVENT: APPEND-ONLY with idempotency key.
   * Prevents duplicate XP grants.
   */
  private async appendXpEvent(userId: string, action: SyncAction): Promise<void> {
    const { xpAction, amount, idempotencyKey, entityType, entityId } = action.data as {
      xpAction: XpActionType;
      amount: number;
      idempotencyKey: string;
      entityType?: string;
      entityId?: string;
    };

    if (!idempotencyKey) return;

    // Check for duplicate
    const existing = await prisma.xpLedger.findFirst({
      where: { idempotencyKey },
    });

    if (existing) return; // Already processed

    await prisma.xpLedger.create({
      data: {
        userId,
        action: xpAction,
        amount,
        entityType,
        entityId,
        idempotencyKey,
      },
    });
  }

  /**
   * Verify HMAC-SHA256 checksum on progress data (FIX-5).
   */
  private verifyChecksum(
    action: SyncAction,
    userId: string,
    deviceSecret: string
  ): boolean {
    const { checksum, ...rest } = action;
    const payload = `${userId}:${JSON.stringify(rest.data)}:${rest.timestamp}`;
    const expected = crypto
      .createHmac("sha256", deviceSecret)
      .update(payload)
      .digest("hex");

    return checksum === expected;
  }

  /**
   * Get sync status for a user (pending items count, last sync time).
   */
  async getSyncStatus(userId: string): Promise<{
    lastSyncAt: Date | null;
    pendingCount: number;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveAt: true },
    });

    return {
      lastSyncAt: user?.lastActiveAt || null,
      pendingCount: 0, // Server doesn't track client-side pending items
    };
  }
}
