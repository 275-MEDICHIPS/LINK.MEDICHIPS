// ---------------------------------------------------------------------------
// Course-related types for MEDICHIPS-LINK
// ---------------------------------------------------------------------------

/** Lesson content block types */
export type ContentBlockType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "QUIZ_EMBED"
  | "INTERACTIVE"
  | "PDF"
  | "CODE_BLOCK";

/** Content review status following L1/L2/L3 risk model */
export type ContentReviewStatus =
  | "DRAFT"
  | "AI_GENERATED"
  | "L1_AUTO_APPROVED"
  | "L2_PENDING_REVIEW"
  | "L3_EXPERT_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

/** Course difficulty level */
export type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

/** Course publication status */
export type CourseStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";

/** Lesson completion status */
export type LessonStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

// ---------------------------------------------------------------------------
// Content structures
// ---------------------------------------------------------------------------

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  mediaUrl?: string;
  caption?: string;
  order: number;
}

export interface ContentVersion {
  id: string;
  lessonId: string;
  version: number;
  locale: string;
  blocks: ContentBlock[];
  reviewStatus: ContentReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  durationMinutes: number;
  xpReward: number;
  /** Whether this lesson can be downloaded for offline use */
  offlineAvailable: boolean;
  /** Latest approved content version */
  content?: LessonContent;
  /** Learner-specific progress (populated in learner context) */
  progress?: LessonProgressSummary;
  createdAt: string;
  updatedAt: string;
}

export interface LessonContent {
  id: string;
  lessonId: string;
  locale: string;
  blocks: ContentBlock[];
  version: number;
  reviewStatus: ContentReviewStatus;
}

export interface LessonProgressSummary {
  status: LessonStatus;
  score: number | null;
  timeSpentSec: number;
  completedAt: string | null;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  lessonCount: number;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export interface Course {
  id: string;
  orgId: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  difficulty: DifficultyLevel;
  status: CourseStatus;
  locale: string;
  /** Available translation locales */
  availableLocales: string[];
  moduleCount: number;
  totalLessons: number;
  totalDurationMinutes: number;
  xpTotal: number;
  enrollmentCount: number;
  /** Tags / categories */
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface CourseWithModules extends Course {
  modules: ModuleWithLessons[];
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt: string | null;
  progressPercent: number;
  lastAccessedAt: string | null;
}

// ---------------------------------------------------------------------------
// Filters & API responses
// ---------------------------------------------------------------------------

export interface CourseFilters {
  search?: string;
  difficulty?: DifficultyLevel;
  status?: CourseStatus;
  locale?: string;
  tags?: string[];
  sortBy?: "title" | "createdAt" | "enrollmentCount" | "difficulty";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CourseListResponse {
  courses: Course[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CourseDetailResponse {
  course: CourseWithModules;
  enrollment: Enrollment | null;
}
