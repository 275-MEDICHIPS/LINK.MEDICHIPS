import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { submitQuizAttempt } from "@/lib/services/quiz.service";

const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.unknown(),
      })
    )
    .transform((arr) =>
      arr.map((item) => ({
        questionId: item.questionId,
        answer: item.answer ?? null,
      }))
    ),
  idempotencyKey: z.string().optional(),
});

/**
 * POST /api/v1/quizzes/[quizId]/attempt
 *
 * Submit a quiz attempt for server-side grading.
 * - quizId param is the lessonId that contains the quiz
 * - Answers are graded server-side; no answers are included in the response
 *   until after grading is complete
 * - Supports idempotency key for offline sync deduplication
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { quizId } = await params;
    const body = await req.json();
    const { answers, idempotencyKey } = submitAttemptSchema.parse(body);

    const result = await submitQuizAttempt(
      payload.sub,
      quizId,
      answers,
      idempotencyKey
    );

    return success(result, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
