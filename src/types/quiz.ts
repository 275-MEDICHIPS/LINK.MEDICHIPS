// ---------------------------------------------------------------------------
// Quiz types for MEDICHIPS-LINK
// ---------------------------------------------------------------------------

/** Supported question types */
export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "IMAGE_HOTSPOT"
  | "MATCHING"
  | "ORDERING";

/** Quiz difficulty level */
export type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

// ---------------------------------------------------------------------------
// Quiz definition
// ---------------------------------------------------------------------------

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  xpReward: number;
  questionCount: number;
  difficulty: QuizDifficulty;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  order: number;
  /** The question text (supports markdown) */
  prompt: string;
  /** Optional image for the question */
  imageUrl?: string;
  /** Explanation shown after answering */
  explanation?: string;
  /** Points for this question */
  points: number;
  /** Type-specific option data */
  options: QuestionOptions;
}

/** Union of option shapes by question type */
export type QuestionOptions =
  | MultipleChoiceOptions
  | TrueFalseOptions
  | FillBlankOptions
  | ImageHotspotOptions
  | MatchingOptions
  | OrderingOptions;

export interface MultipleChoiceOptions {
  type: "MULTIPLE_CHOICE";
  choices: { id: string; text: string; imageUrl?: string }[];
  /** ID of the correct choice */
  correctId: string;
  /** Allow multiple correct answers */
  multiSelect: boolean;
  correctIds?: string[];
}

export interface TrueFalseOptions {
  type: "TRUE_FALSE";
  correctAnswer: boolean;
}

export interface FillBlankOptions {
  type: "FILL_BLANK";
  /** Accepted answers (case-insensitive matching) */
  acceptedAnswers: string[];
  /** Placeholder hint text */
  placeholder?: string;
}

export interface ImageHotspotOptions {
  type: "IMAGE_HOTSPOT";
  imageUrl: string;
  /** Target regions as percent coordinates */
  hotspots: {
    id: string;
    label: string;
    x: number;
    y: number;
    radius: number;
  }[];
  /** Which hotspot(s) should be selected */
  correctHotspotIds: string[];
}

export interface MatchingOptions {
  type: "MATCHING";
  pairs: { id: string; left: string; right: string }[];
}

export interface OrderingOptions {
  type: "ORDERING";
  items: { id: string; text: string }[];
  /** Correct order of item IDs */
  correctOrder: string[];
}

// ---------------------------------------------------------------------------
// Quiz attempt & answers
// ---------------------------------------------------------------------------

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  timeSpentSec: number;
  score: number | null;
  maxScore: number;
  passed: boolean | null;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  questionId: string;
  /** The learner's submitted answer (shape varies by question type) */
  answer: AnswerValue;
  correct: boolean | null;
  pointsEarned: number;
  answeredAt: string;
}

/** Answer value shapes per question type */
export type AnswerValue =
  | { type: "MULTIPLE_CHOICE"; selectedId: string }
  | { type: "MULTIPLE_CHOICE_MULTI"; selectedIds: string[] }
  | { type: "TRUE_FALSE"; value: boolean }
  | { type: "FILL_BLANK"; text: string }
  | { type: "IMAGE_HOTSPOT"; selectedHotspotIds: string[] }
  | { type: "MATCHING"; pairs: { leftId: string; rightId: string }[] }
  | { type: "ORDERING"; orderedIds: string[] };

// ---------------------------------------------------------------------------
// Quiz result summary
// ---------------------------------------------------------------------------

export interface QuizResult {
  attemptId: string;
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  xpEarned: number;
  timeSpentSec: number;
  questionResults: {
    questionId: string;
    correct: boolean;
    pointsEarned: number;
    explanation?: string;
  }[];
  /** New badge earned from this quiz, if any */
  badgeEarned?: { id: string; name: string; iconUrl: string } | null;
}

// ---------------------------------------------------------------------------
// Quiz filters
// ---------------------------------------------------------------------------

export interface QuizFilters {
  lessonId?: string;
  difficulty?: QuizDifficulty;
  aiGenerated?: boolean;
}
