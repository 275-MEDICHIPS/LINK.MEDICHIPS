/**
 * AI Quiz Generator for MEDICHIPS-LINK.
 *
 * Creates medically-accurate quiz questions from lesson content.
 * Supports multiple question types and difficulty levels.
 */

import { callClaudeJson } from "./claude";
import {
  QUIZ_GENERATOR_SYSTEM,
  DISTRACTOR_GENERATOR_SYSTEM,
} from "./prompts/quiz-generator";

// ─── Types ──────────────────────────────────────────────────────────────

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "IMAGE_HOTSPOT"
  | "MATCHING"
  | "ORDERING";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type BloomLevel = "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE";

export interface QuizGeneratorConfig {
  questionCount: number;
  types: QuestionType[];
  difficulty: Difficulty;
  locale: string;
}

export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  options: string[] | null;
  correctAnswer: string | number | string[] | number[];
  explanation: string;
  difficulty: Difficulty;
  bloomLevel: BloomLevel;
}

export interface GeneratedQuiz {
  questions: GeneratedQuestion[];
}

export interface Distractor {
  text: string;
  whyWrong: string;
}

export interface DistractorResult {
  distractors: Distractor[];
}

// ─── Functions ──────────────────────────────────────────────────────────

/**
 * Generate a quiz from lesson content.
 *
 * @param lessonContent - The lesson text/body to base questions on.
 * @param config        - Question count, types, difficulty, locale.
 */
export async function generateQuiz(
  lessonContent: string,
  config: QuizGeneratorConfig
): Promise<GeneratedQuiz> {
  const { questionCount, types, difficulty, locale } = config;

  const typeDistribution = buildTypeDistribution(types, questionCount);

  const userPrompt = [
    `Generate a quiz based on the following lesson content.`,
    ``,
    `CONFIGURATION:`,
    `- Total questions: ${questionCount}`,
    `- Question type distribution:`,
    ...typeDistribution.map(
      ({ type, count }) => `  - ${type}: ${count} question(s)`
    ),
    `- Difficulty level: ${difficulty}`,
    `- Language/locale: ${locale}`,
    ``,
    `LESSON CONTENT:`,
    `---`,
    lessonContent.slice(0, 30_000),
    `---`,
    ``,
    `Generate exactly ${questionCount} questions following the distribution above.`,
    `Each question must include an explanation for the correct answer.`,
  ].join("\n");

  const result = await callClaudeJson<GeneratedQuiz>({
    system: QUIZ_GENERATOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4_096,
    temperature: 0.4,
  });

  // Validate we got the right number of questions
  if (result.questions.length < questionCount) {
    console.warn(
      `[quiz-generator] Requested ${questionCount} questions but got ${result.questions.length}.`
    );
  }

  return result;
}

/**
 * Generate plausible wrong answers (distractors) for a multiple-choice question.
 *
 * @param question      - The question text.
 * @param correctAnswer - The correct answer.
 * @param count         - Number of distractors to generate.
 */
export async function generateDistractors(
  question: string,
  correctAnswer: string,
  count: number = 3
): Promise<DistractorResult> {
  const userPrompt = [
    `Generate ${count} plausible but incorrect answers (distractors) for this medical quiz question.`,
    ``,
    `QUESTION: ${question}`,
    `CORRECT ANSWER: ${correctAnswer}`,
    `NUMBER OF DISTRACTORS: ${count}`,
    ``,
    `Each distractor should represent a different type of common error or misconception.`,
  ].join("\n");

  return callClaudeJson<DistractorResult>({
    system: DISTRACTOR_GENERATOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 1_024,
    temperature: 0.5,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Distribute the total question count across the requested types
 * as evenly as possible.
 */
function buildTypeDistribution(
  types: QuestionType[],
  total: number
): { type: QuestionType; count: number }[] {
  if (types.length === 0) {
    return [{ type: "MULTIPLE_CHOICE", count: total }];
  }

  const base = Math.floor(total / types.length);
  let remainder = total % types.length;

  return types.map((type) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder--;
    return { type, count: base + extra };
  });
}
