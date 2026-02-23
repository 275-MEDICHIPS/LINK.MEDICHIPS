/**
 * POST /api/v1/ai/quiz-generate
 *
 * Generate quiz questions for a lesson using AI.
 * Fetches the lesson content, generates questions, and returns them
 * for instructor review before attaching to the lesson.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  authenticate,
  requireRole,
  handleAuthError,
} from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";
import {
  generateQuiz,
  generateDistractors,
  type QuestionType,
  type Difficulty,
} from "@/lib/ai/quiz-generator";

// ─── Validation ─────────────────────────────────────────────────────────

const quizGenerateSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  questionCount: z.number().int().min(1).max(30).default(5),
  types: z
    .array(
      z.enum([
        "MULTIPLE_CHOICE",
        "TRUE_FALSE",
        "FILL_BLANK",
        "IMAGE_HOTSPOT",
        "MATCHING",
        "ORDERING",
      ])
    )
    .min(1)
    .default(["MULTIPLE_CHOICE", "TRUE_FALSE"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  locale: z.string().min(2).max(10).default("en"),
});

const distractorSchema = z.object({
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  count: z.number().int().min(1).max(6).default(3),
});

// ─── Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(
      payload,
      "INSTRUCTOR",
      "ORG_ADMIN",
      "SUPER_ADMIN"
    );

    const body = await req.json();

    // Check if this is a distractor generation request
    if (body.question && body.correctAnswer) {
      const input = distractorSchema.parse(body);
      const result = await generateDistractors(
        input.question,
        input.correctAnswer,
        input.count
      );
      return success(result);
    }

    // Otherwise, generate a full quiz
    const input = quizGenerateSchema.parse(body);

    // Fetch the lesson and its latest published content
    const lesson = await prisma.lesson.findFirst({
      where: { id: input.lessonId, deletedAt: null },
      include: {
        translations: { where: { locale: input.locale } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!lesson) {
      throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }

    if (lesson.versions.length === 0) {
      throw new ApiError(
        "Lesson has no content versions",
        400,
        "NO_CONTENT"
      );
    }

    // Extract text content from the lesson body
    const contentVersion = lesson.versions[0];
    const body_content = contentVersion.body as Record<string, unknown>;
    const lessonText = extractTextFromBody(body_content);

    if (lessonText.length < 50) {
      throw new ApiError(
        "Lesson content is too short to generate meaningful quiz questions",
        400,
        "CONTENT_TOO_SHORT"
      );
    }

    // Add lesson title for context
    const lessonTitle =
      lesson.translations[0]?.title ?? `Lesson ${lesson.id}`;
    const fullContent = `LESSON TITLE: ${lessonTitle}\n\n${lessonText}`;

    // Generate the quiz
    const quiz = await generateQuiz(fullContent, {
      questionCount: input.questionCount,
      types: input.types as QuestionType[],
      difficulty: input.difficulty as Difficulty,
      locale: input.locale,
    });

    return success({
      lessonId: input.lessonId,
      lessonTitle,
      quiz,
      isAiGenerated: true,
    }, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AuthError" || error.message.includes("Authentication"))
    ) {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Recursively extract text from a lesson body JSON structure.
 * Handles the { sections: [{ type, content, items }] } format.
 */
function extractTextFromBody(body: Record<string, unknown>): string {
  const parts: string[] = [];

  if (typeof body === "string") {
    return body;
  }

  // Handle sections array
  const sections = body.sections as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (typeof section.content === "string") {
        parts.push(section.content);
      }
      if (Array.isArray(section.items)) {
        for (const item of section.items) {
          if (typeof item === "string") {
            parts.push(item);
          }
        }
      }
    }
  }

  // Handle plain text body
  if (typeof body.text === "string") {
    parts.push(body.text);
  }

  // Handle content field directly
  if (typeof body.content === "string") {
    parts.push(body.content);
  }

  // Handle blocks array (alternative format)
  const blocks = body.blocks as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(blocks)) {
    for (const block of blocks) {
      if (typeof block.text === "string") {
        parts.push(block.text);
      }
      if (typeof block.content === "string") {
        parts.push(block.content);
      }
    }
  }

  return parts.join("\n\n");
}
