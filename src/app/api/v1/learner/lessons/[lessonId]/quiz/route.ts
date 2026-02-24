import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { submitQuizAttempt } from "@/lib/services/quiz.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const { lessonId } = await params;

    const body = await req.json();
    const { answers } = body;

    // Convert frontend format { questionId: answer } to service format [{ questionId, answer }]
    const formattedAnswers = Object.entries(answers as Record<string, unknown>).map(
      ([questionId, answer]) => ({ questionId, answer })
    );

    const result = await submitQuizAttempt(userId, lessonId, formattedAnswers);

    // Build correctAnswers map for frontend display
    const correctAnswers: Record<string, unknown> = {};
    if ("gradedQuestions" in result) {
      for (const gq of result.gradedQuestions) {
        if (gq.correct) {
          const submitted = formattedAnswers.find(
            (a) => a.questionId === gq.questionId
          );
          correctAnswers[gq.questionId] = submitted?.answer;
        }
      }
    }

    return success({
      passed: result.passed,
      score: result.score,
      correctAnswers,
    });
  } catch (error) {
    return handleError(error);
  }
}
