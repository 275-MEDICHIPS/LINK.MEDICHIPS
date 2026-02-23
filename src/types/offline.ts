// ---------------------------------------------------------------------------
// Offline & sync types for MEDICHIPS-LINK
// ---------------------------------------------------------------------------

/** Sync queue action types */
export type SyncAction =
  | "LESSON_PROGRESS_UPDATE"
  | "QUIZ_ATTEMPT_SUBMIT"
  | "TASK_CHECKLIST_UPDATE"
  | "TASK_EVIDENCE_UPLOAD"
  | "TASK_SUBMIT"
  | "XP_CLAIM"
  | "NOTIFICATION_READ";

/** Sync item status */
export type SyncItemStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

/** Conflict resolution strategy (domain-specific, NOT last-write-wins) */
export type MergeStrategy =
  | "MAX_PROGRESS"
  | "APPEND_ONLY"
  | "SERVER_WINS"
  | "APPEND_ALL"
  | "DEDUP_IDEMPOTENCY";

// ---------------------------------------------------------------------------
// Sync queue
// ---------------------------------------------------------------------------

export interface SyncQueueItem {
  id: string;
  userId: string;
  action: SyncAction;
  payload: unknown;
  status: SyncItemStatus;
  retryCount: number;
  maxRetries: number;
  /** HMAC checksum for data integrity */
  checksum?: string;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface SyncResult {
  totalProcessed: number;
  synced: number;
  failed: number;
  conflicts: number;
  /** Items that had conflicts and were merged */
  mergedItems: SyncMergeResult[];
  completedAt: string;
}

export interface SyncMergeResult {
  itemId: string;
  action: SyncAction;
  strategy: MergeStrategy;
  serverVersion: unknown;
  clientVersion: unknown;
  resolvedVersion: unknown;
}

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

export interface ConflictResolution {
  itemId: string;
  action: SyncAction;
  strategy: MergeStrategy;
  /** Server-side data */
  serverData: unknown;
  /** Client-side data */
  clientData: unknown;
  /** Resolved data after merge */
  resolvedData: unknown;
  resolvedAt: string;
}

// ---------------------------------------------------------------------------
// Downloaded media for offline use
// ---------------------------------------------------------------------------

export interface DownloadedMedia {
  id: string;
  userId: string;
  lessonId: string;
  url: string;
  /** Cached blob in IndexedDB */
  blob?: Blob;
  mimeType: string;
  sizeMB: number;
  downloadedAt: number;
  /** Expiry timestamp */
  expiresAt: number;
  /** Content version at time of download */
  contentVersion: number;
}

// ---------------------------------------------------------------------------
// Offline lesson (full lesson cached for offline consumption)
// ---------------------------------------------------------------------------

export interface OfflineLesson {
  id: string;
  lessonId: string;
  userId: string;
  courseId: string;
  moduleId: string;
  title: string;
  /** Serialized content blocks with embedded media references */
  content: OfflineLessonContent;
  /** Associated media files */
  mediaIds: string[];
  /** Content version at time of download */
  contentVersion: number;
  downloadedAt: number;
  /** Whether content has been updated on server since download */
  stale: boolean;
  /** Total size of lesson + media in MB */
  totalSizeMB: number;
}

export interface OfflineLessonContent {
  blocks: OfflineContentBlock[];
  locale: string;
  version: number;
}

export interface OfflineContentBlock {
  id: string;
  type: string;
  content: string;
  /** Local blob URL or IndexedDB key for media */
  localMediaKey?: string;
  /** Original remote URL for reference */
  remoteMediaUrl?: string;
  order: number;
}

// ---------------------------------------------------------------------------
// Download management
// ---------------------------------------------------------------------------

export interface DownloadTask {
  id: string;
  lessonId: string;
  userId: string;
  status: "QUEUED" | "DOWNLOADING" | "COMPLETED" | "FAILED";
  progress: number;
  totalSizeMB: number;
  downloadedMB: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface StorageEstimate {
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  lessonCount: number;
  mediaCount: number;
}

// ---------------------------------------------------------------------------
// Pending upload (evidence files queued for upload when online)
// ---------------------------------------------------------------------------

export interface PendingUpload {
  id: string;
  userId: string;
  taskId: string;
  fileBlob: Blob;
  fileType: string;
  fileName: string;
  fileSizeMB: number;
  gpsLat?: number;
  gpsLng?: number;
  createdAt: number;
  retryCount: number;
}
