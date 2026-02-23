import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "IMAGE_HOTSPOT"
  | "MATCHING"
  | "ORDERING";

interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  imageUrl?: string;
  hotspots?: Array<{ id: string; x: number; y: number; radius: number }>;
  matchPairs?: Array<{ id: string; left: string; right: string }>;
  orderItems?: Array<{ id: string; text: string }>;
  points: number;
}

interface QuizQuestionWithAnswer extends QuizQuestion {
  correctAnswer: unknown;
}

interface QuizBody {
  quizVersion: number;
  passingScore: number; // percentage 0-100
  questions: QuizQuestionWithAnswer[];
}

interface SubmittedAnswer {
  questionId: string;
  answer: unknown;
}

interface GradedQuestion {
  questionId: string;
  correct: boolean;
  pointsEarned: number;
  pointsPossible: number;
}

const PASS_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// Internal: grade a single question
// ---------------------------------------------------------------------------

function gradeQuestion(
  question: QuizQuestionWithAnswer,
  submittedAnswer: unknown
): { correct: boolean; pointsEarned: number } {
  const { type, correctAnswer, points } = question;

  switch (type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE": {
      const correct = submittedAnswer === correctAnswer;
      return { correct, pointsEarned: correct ? points : 0 };
    }

    case "FILL_BLANK": {
      const expected = String(correctAnswer).trim().toLowerCase();
      const given = String(submittedAnswer ?? "").trim().toLowerCase();
      const correct = expected === given;
      return { correct, pointsEarned: correct ? points : 0 };
    }

    case "IMAGE_HOTSPOT": {
      // correctAnswer is the hotspot id(s) that should be selected
      const expectedIds = Array.isArray(correctAnswer)
        ? (correctAnswer as string[])
        : [correctAnswer as string];
      const givenIds = Array.isArray(submittedAnswer)
        ? (submittedAnswer as string[])
        : [submittedAnswer as string];

      const correct =
        expectedIds.length === givenIds.length &&
        expectedIds.every((id) => givenIds.includes(id));
      return { correct, pointsEarned: correct ? points : 0 };
    }

    case "MATCHING": {
      // correctAnswer: Record<string, string> mapping left id -> right id
      const expected = correctAnswer as Record<string, string>;
      const given = (submittedAnswer ?? {}) as Record<string, string>;

      const pairs = Object.entries(expected);
      let correctCount = 0;
      for (const [leftId, rightId] of pairs) {
        if (given[leftId] === rightId) correctCount++;
      }

      const allCorrect = correctCount === pairs.length;
      // Partial credit: proportional to correct pairs
      const earned =
        pairs.length > 0
          ? Math.round((correctCount / pairs.length) * points)
          : 0;
      return { correct: allCorrect, pointsEarned: earned };
    }

    case "ORDERING": {
      // correctAnswer: string[] — ordered list of item ids
      const expected = correctAnswer as string[];
      const given = (submittedAnswer ?? []) as string[];

      const correct =
        expected.length === given.length &&
        expected.every((id, idx) => id === given[idx]);
      return { correct, pointsEarned: correct ? points : 0 };
    }

    default: {
      return { correct: false, pointsEarned: 0 };
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get quiz questions for a lesson WITHOUT correct answers (FIX-5).
 * Optionally filter by locale for translated prompt text.
 */
export async function getQuiz(lessonId: string, locale?: string) {
  const contentVersion = await prisma.contentVersion.findFirst({
    where: {
      lessonId,
      status: "PUBLISHED",
      lesson: { contentType: { in: ["QUIZ", "MIXED"] } },
    },
    orderBy: { version: "desc" },
  });

  if (!contentVersion) {
    throw new ApiError("Quiz not found for this lesson", 404);
  }

  const body = contentVersion.body as unknown as QuizBody;
  if (!body.questions || body.questions.length === 0) {
    throw new ApiError("Quiz has no questions", 404);
  }

  // Strip answers before returning to client
  const sanitizedQuestions: QuizQuestion[] = body.questions.map((q) => {
    const { correctAnswer: _removed, ...questionWithoutAnswer } = q;
    return questionWithoutAnswer;
  });

  return {
    lessonId,
    quizVersion: body.quizVersion,
    passingScore: body.passingScore ?? PASS_THRESHOLD,
    questionCount: sanitizedQuestions.length,
    totalPoints: body.questions.reduce((sum, q) => sum + q.points, 0),
    questions: sanitizedQuestions,
  };
}

/**
 * Submit and grade a quiz attempt server-side.
 * Uses idempotency key to prevent duplicate submissions.
 */
export async function submitQuizAttempt(
  userId: string,
  lessonId: string,
  answers: SubmittedAnswer[],
  idempotencyKey?: string
) {
  // Idempotency check
  if (idempotencyKey) {
    const existing = await prisma.quizAttempt.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing;
    }
  }

  // Load quiz with answers for grading
  const contentVersion = await prisma.contentVersion.findFirst({
    where: {
      lessonId,
      status: "PUBLISHED",
      lesson: { contentType: { in: ["QUIZ", "MIXED"] } },
    },
    orderBy: { version: "desc" },
  });

  if (!contentVersion) {
    throw new ApiError("Quiz not found for this lesson", 404);
  }

  const body = contentVersion.body as unknown as QuizBody;

  // Grade each question
  const gradedQuestions: GradedQuestion[] = body.questions.map((question) => {
    const submitted = answers.find((a) => a.questionId === question.id);
    const result = gradeQuestion(question, submitted?.answer);
    return {
      questionId: question.id,
      correct: result.correct,
      pointsEarned: result.pointsEarned,
      pointsPossible: question.points,
    };
  });

  const totalPointsEarned = gradedQuestions.reduce(
    (sum, q) => sum + q.pointsEarned,
    0
  );
  const totalPointsPossible = gradedQuestions.reduce(
    (sum, q) => sum + q.pointsPossible,
    0
  );
  const scorePercent =
    totalPointsPossible > 0
      ? Math.round((totalPointsEarned / totalPointsPossible) * 100 * 100) / 100
      : 0;
  const passed = scorePercent >= (body.passingScore ?? PASS_THRESHOLD);

  // Determine attempt number
  const previousAttempts = await prisma.quizAttempt.count({
    where: { userId, lessonId },
  });

  const now = new Date();
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      lessonId,
      quizVersion: body.quizVersion,
      answers: gradedQuestions as unknown as Prisma.InputJsonValue,
      score: scorePercent,
      passed,
      attemptNumber: previousAttempts + 1,
      idempotencyKey,
      startedAt: now,
      completedAt: now,
    },
  });

  // If passed, award XP via idempotent ledger entry
  if (passed) {
    const xpKey = `quiz_pass:${userId}:${lessonId}:best`;

    // Only award XP once per lesson (first pass)
    const existingXp = await prisma.xpLedger.findUnique({
      where: { idempotencyKey: xpKey },
    });

    if (!existingXp) {
      await prisma.xpLedger.create({
        data: {
          userId,
          action: "QUIZ_PASS",
          amount: 50,
          entityType: "Lesson",
          entityId: lessonId,
          idempotencyKey: xpKey,
        },
      });
    }
  }

  return {
    id: attempt.id,
    score: attempt.score,
    passed: attempt.passed,
    attemptNumber: attempt.attemptNumber,
    gradedQuestions,
    totalPointsEarned,
    totalPointsPossible,
  };
}

/**
 * Get all quiz attempts for a user on a specific lesson.
 */
export async function getQuizAttempts(userId: string, lessonId: string) {
  return prisma.quizAttempt.findMany({
    where: { userId, lessonId },
    orderBy: { attemptNumber: "desc" },
    select: {
      id: true,
      quizVersion: true,
      score: true,
      passed: true,
      attemptNumber: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });
}

/**
 * Get aggregated quiz statistics for admin view.
 */
export async function getQuizStats(lessonId: string) {
  const [attempts, passCount, scoreAgg] = await Promise.all([
    prisma.quizAttempt.count({ where: { lessonId } }),
    prisma.quizAttempt.count({ where: { lessonId, passed: true } }),
    prisma.quizAttempt.aggregate({
      where: { lessonId },
      _avg: { score: true },
      _min: { score: true },
      _max: { score: true },
    }),
  ]);

  const uniqueLearners = await prisma.quizAttempt.groupBy({
    by: ["userId"],
    where: { lessonId },
  });

  return {
    lessonId,
    totalAttempts: attempts,
    uniqueLearners: uniqueLearners.length,
    passCount,
    passRate: attempts > 0 ? Math.round((passCount / attempts) * 100 * 100) / 100 : 0,
    averageScore: scoreAgg._avg.score ?? 0,
    minScore: scoreAgg._min.score ?? 0,
    maxScore: scoreAgg._max.score ?? 0,
  };
}
