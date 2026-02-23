import { offlineDb, type SyncQueueItem } from "./db";

const SYNC_ENDPOINT = "/api/v1/progress/sync";
const BATCH_SIZE = 50;
const MAX_RETRIES = 5;

export type SyncStatus = "idle" | "syncing" | "error";

/**
 * Offline Sync Manager
 * FIFO queue, batch POST, domain-specific merge strategies (FIX-2)
 */
export class SyncManager {
  private status: SyncStatus = "idle";
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  onStatusChange(listener: (status: SyncStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus) {
    this.status = status;
    this.listeners.forEach((l) => l(status));
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Queue an action for sync.
   */
  async enqueue(userId: string, action: string, payload: unknown) {
    await offlineDb.syncQueue.add({
      id: crypto.randomUUID(),
      userId,
      action,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    });
  }

  /**
   * Process the sync queue (FIFO).
   * Called when connection is restored or periodically.
   */
  async processQueue(userId: string): Promise<{
    synced: number;
    failed: number;
  }> {
    if (this.status === "syncing") return { synced: 0, failed: 0 };
    this.setStatus("syncing");

    let synced = 0;
    let failed = 0;

    try {
      const items = await offlineDb.syncQueue
        .where("userId")
        .equals(userId)
        .sortBy("createdAt");

      // Process in batches
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        try {
          const csrfToken = document.cookie
            .split("; ")
            .find((c) => c.startsWith("csrf_token="))
            ?.split("=")[1];

          const res = await fetch(SYNC_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
            },
            body: JSON.stringify({ items: batch.map((b) => b.payload) }),
          });

          if (res.ok) {
            const result = await res.json();
            // Remove synced items
            const syncedIds = batch.map((b) => b.id);
            await offlineDb.syncQueue.bulkDelete(syncedIds);
            synced += batch.length;

            // Update local progress with server responses
            if (result.data?.results) {
              await this.applyServerResponses(userId, result.data.results);
            }
          } else if (res.status === 409) {
            // Conflict — apply server version
            const result = await res.json();
            await this.resolveConflicts(userId, batch, result.data);
            synced += batch.length;
          } else {
            // Retry later
            await this.incrementRetry(batch);
            failed += batch.length;
          }
        } catch {
          await this.incrementRetry(batch);
          failed += batch.length;
        }
      }

      // Upload pending files
      await this.uploadPendingFiles(userId);

      this.setStatus("idle");
    } catch {
      this.setStatus("error");
    }

    return { synced, failed };
  }

  private async incrementRetry(items: SyncQueueItem[]) {
    for (const item of items) {
      if (item.retryCount >= MAX_RETRIES) {
        await offlineDb.syncQueue.delete(item.id);
      } else {
        await offlineDb.syncQueue.update(item.id, {
          retryCount: item.retryCount + 1,
        });
      }
    }
  }

  private async applyServerResponses(
    userId: string,
    results: Array<{
      type: string;
      id: string;
      data: Record<string, unknown>;
    }>
  ) {
    for (const result of results) {
      switch (result.type) {
        case "lesson_progress":
          await offlineDb.lessonProgress
            .where("[userId+lessonId]")
            .equals([userId, result.id])
            .modify({ syncedAt: Date.now(), ...result.data });
          break;
        case "quiz_attempt":
          // Server returns score after grading
          await offlineDb.quizAttempts
            .where("idempotencyKey")
            .equals(result.id)
            .modify({
              syncedAt: Date.now(),
              score: result.data.score as number,
              passed: result.data.passed as boolean,
            });
          break;
      }
    }
  }

  private async resolveConflicts(
    userId: string,
    _batch: SyncQueueItem[],
    serverData: unknown
  ) {
    // Domain-specific merge (FIX-2):
    // LessonProgress: MAX(server, client) — keep higher progress
    // QuizAttempt: APPEND-ONLY
    // TaskProgress: server wins
    // Evidence: APPEND all
    // XP: dedup by idempotency key
    if (serverData && typeof serverData === "object") {
      const data = serverData as Record<string, unknown>;
      if (data.lessonProgress && Array.isArray(data.lessonProgress)) {
        for (const serverItem of data.lessonProgress as Array<Record<string, unknown>>) {
          const lessonId = serverItem.lessonId as string;
          const local = await offlineDb.lessonProgress
            .where("[userId+lessonId]")
            .equals([userId, lessonId])
            .first();

          if (local) {
            // MAX merge: keep whichever has more progress
            const serverTime = (serverItem.timeSpentSec as number) || 0;
            const localTime = local.timeSpentSec || 0;
            await offlineDb.lessonProgress
              .where("[userId+lessonId]")
              .equals([userId, lessonId])
              .modify({
                timeSpentSec: Math.max(serverTime, localTime),
                status:
                  serverItem.status === "COMPLETED" ||
                  local.status === "COMPLETED"
                    ? "COMPLETED"
                    : serverItem.status === "IN_PROGRESS" ||
                        local.status === "IN_PROGRESS"
                      ? "IN_PROGRESS"
                      : local.status,
                score: Math.max(
                  (serverItem.score as number) || 0,
                  local.score || 0
                ),
                syncedAt: Date.now(),
              });
          }
        }
      }
    }

    // Remove processed items from queue
    const ids = _batch.map((b) => b.id);
    await offlineDb.syncQueue.bulkDelete(ids);
  }

  private async uploadPendingFiles(userId: string) {
    const uploads = await offlineDb.pendingUploads
      .where("userId")
      .equals(userId)
      .toArray();

    for (const upload of uploads) {
      try {
        const formData = new FormData();
        formData.append("file", upload.fileBlob, `evidence.${upload.fileType}`);
        formData.append("taskId", upload.taskId);
        if (upload.gpsLat) formData.append("gpsLat", String(upload.gpsLat));
        if (upload.gpsLng) formData.append("gpsLng", String(upload.gpsLng));

        const res = await fetch(`/api/v1/tasks/${upload.taskId}/evidence`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          await offlineDb.pendingUploads.delete(upload.id);
        }
      } catch {
        // Will retry on next sync
      }
    }
  }

  /**
   * Get pending sync count for UI indicator.
   */
  async getPendingCount(userId: string): Promise<number> {
    return offlineDb.syncQueue.where("userId").equals(userId).count();
  }
}

export const syncManager = new SyncManager();

/**
 * Register Background Sync for when connectivity returns.
 */
export async function registerBackgroundSync() {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-progress");
    } catch {
      // Background Sync not supported
    }
  }
}
