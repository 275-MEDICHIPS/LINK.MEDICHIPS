// ---------------------------------------------------------------------------
// Task & verification types for MEDICHIPS-LINK (D-V in L-D-V-I cycle)
// ---------------------------------------------------------------------------

/** Task status from learner perspective */
export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

/** Verification type (L1 = AI auto, L2 = supervisor, L3 = expert) */
export type VerificationType = "L1_AUTO" | "L2_SUPERVISOR" | "L3_EXPERT";

/** Verification result */
export type VerificationResult = "APPROVED" | "REJECTED" | "NEEDS_REVISION";

/** Evidence file type */
export type EvidenceType = "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";

// ---------------------------------------------------------------------------
// Task definition
// ---------------------------------------------------------------------------

export interface Task {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  title: string;
  description: string;
  instructions: string;
  /** Ordered checklist items the learner must complete */
  checklist: TaskChecklistItem[];
  /** What evidence is required */
  requiredEvidence: RequiredEvidence[];
  /** Which verification levels are needed */
  verificationLevels: VerificationType[];
  /** GPS verification required */
  gpsRequired: boolean;
  /** Digital signature required */
  signatureRequired: boolean;
  xpReward: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChecklistItem {
  id: string;
  label: string;
  description?: string;
  order: number;
  required: boolean;
}

export interface RequiredEvidence {
  type: EvidenceType;
  description: string;
  minCount: number;
  maxCount: number;
}

// ---------------------------------------------------------------------------
// Task submission (learner side)
// ---------------------------------------------------------------------------

export interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  status: TaskStatus;
  checklistProgress: ChecklistProgress[];
  evidence: TaskEvidence[];
  gpsData?: GpsMetadata;
  digitalSignature?: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistProgress {
  checklistItemId: string;
  completed: boolean;
  completedAt: string | null;
  notes?: string;
}

export interface TaskEvidence {
  id: string;
  submissionId: string;
  type: EvidenceType;
  fileUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSizeMB: number;
  mimeType: string;
  gpsData?: GpsMetadata;
  uploadedAt: string;
  /** AI analysis result (L1 verification) */
  aiAnalysis?: AiEvidenceAnalysis;
}

export interface GpsMetadata {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: string;
  /** Reverse-geocoded address */
  address?: string;
}

export interface AiEvidenceAnalysis {
  score: number;
  confidence: number;
  findings: string[];
  flags: string[];
  analyzedAt: string;
}

// ---------------------------------------------------------------------------
// Verification (supervisor / expert side)
// ---------------------------------------------------------------------------

export interface VerificationRecord {
  id: string;
  submissionId: string;
  verifierId: string;
  verifierName: string;
  type: VerificationType;
  result: VerificationResult;
  feedback: string;
  /** Per-checklist-item verification */
  checklistVerification: ChecklistVerification[];
  digitalSignature?: string;
  gpsData?: GpsMetadata;
  /** AI verification score (L1) */
  aiScore?: number;
  createdAt: string;
}

export interface ChecklistVerification {
  checklistItemId: string;
  verified: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Supervisor task review types
// ---------------------------------------------------------------------------

export interface TaskReviewItem {
  submission: TaskSubmission;
  task: Task;
  learnerName: string;
  learnerAvatarUrl?: string;
  latestVerification?: VerificationRecord;
  aiScore?: number;
}

export interface TaskReviewFilters {
  status?: "SUBMITTED" | "VERIFIED" | "REJECTED";
  learnerId?: string;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface TaskReviewListResponse {
  items: TaskReviewItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
