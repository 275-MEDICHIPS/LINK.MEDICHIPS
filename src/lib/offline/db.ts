import Dexie, { type Table } from "dexie";

// IndexedDB schema for offline-first PWA
// All keys prefixed with userId for shared device support (FIX-14)

export interface OfflineCourse {
  id: string;
  userId: string;
  courseId: string;
  data: unknown;
  downloadedAt: number;
}

export interface OfflineLesson {
  id: string;
  userId: string;
  lessonId: string;
  moduleId: string;
  courseId: string;
  content: unknown; // Lesson content JSON (NO quiz answers - FIX-5)
  downloadedAt: number;
}

export interface OfflineLessonProgress {
  id: string;
  lessonId: string;
  userId: string;
  status: string;
  score: number | null;
  timeSpentSec: number;
  lastPosition: number | null;
  checksum: string; // HMAC-SHA256 for integrity (FIX-5)
  updatedAt: number;
  syncedAt: number | null;
}

export interface OfflineQuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  answers: unknown; // Only selections stored, NO correct answers (FIX-5)
  attemptNumber: number;
  idempotencyKey: string;
  completedAt: number;
  syncedAt: number | null;
  // score is null until synced — server grades only
  score: number | null;
  passed: boolean | null;
}

export interface OfflineTaskProgress {
  id: string;
  userId: string;
  taskId: string;
  status: string;
  updatedAt: number;
  syncedAt: number | null;
}

export interface OfflinePendingUpload {
  id: string;
  userId: string;
  taskId: string;
  fileBlob: Blob;
  fileType: string;
  gpsLat: number | null;
  gpsLng: number | null;
  createdAt: number;
}

export interface SyncQueueItem {
  id: string;
  userId: string;
  action: string;
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

export interface DownloadedMedia {
  id: string;
  lessonId: string;
  url: string;
  cacheKey: string;
  sizeBytes: number;
  quality: string; // "audio" | "240p" | "480p" | "720p"
  downloadedAt: number;
  // Media is shared across users (FIX-14)
}

class MedichipsLinkDB extends Dexie {
  courses!: Table<OfflineCourse>;
  lessons!: Table<OfflineLesson>;
  lessonProgress!: Table<OfflineLessonProgress>;
  quizAttempts!: Table<OfflineQuizAttempt>;
  taskProgress!: Table<OfflineTaskProgress>;
  pendingUploads!: Table<OfflinePendingUpload>;
  syncQueue!: Table<SyncQueueItem>;
  downloadedMedia!: Table<DownloadedMedia>;

  constructor() {
    super("medichips-link");

    this.version(1).stores({
      courses: "id, [userId+courseId], userId",
      lessons: "id, [userId+lessonId], [userId+courseId], userId",
      lessonProgress:
        "id, [userId+lessonId], userId, syncedAt",
      quizAttempts:
        "id, [userId+lessonId], userId, idempotencyKey, syncedAt",
      taskProgress: "id, [userId+taskId], userId, syncedAt",
      pendingUploads: "id, userId, taskId, createdAt",
      syncQueue: "id, userId, createdAt",
      downloadedMedia: "id, lessonId, url",
    });
  }
}

export const offlineDb = new MedichipsLinkDB();

/**
 * Request persistent storage to prevent browser from evicting data.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}

/**
 * Get storage usage estimate.
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}
