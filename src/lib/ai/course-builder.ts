/**
 * AI Course Builder — SOP-to-Course pipeline.
 *
 * Converts raw documents (SOPs, clinical guidelines, protocols) into
 * structured microlearning courses following the L-D-V-I cycle.
 */

import { callClaudeJson } from "./claude";
import {
  FULL_COURSE_BUILD_SYSTEM,
  COURSE_STRUCTURE_SYSTEM,
  LESSON_CONTENT_SYSTEM,
} from "./prompts/course-builder";

// ─── Types ──────────────────────────────────────────────────────────────

export interface CourseBuilderConfig {
  targetLocale: string;
  riskLevel: "L1" | "L2" | "L3";
  specialtyId?: string;
  maxModules?: number;
  maxLessonsPerModule?: number;
}

export interface LessonSection {
  type: "heading" | "text" | "list" | "callout" | "image_placeholder" | "summary";
  content: string;
  items?: string[];
}

export interface QuizQuestion {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "ORDERING";
  question: string;
  options?: string[];
  correctAnswer: string | number | string[];
  explanation: string;
}

export interface GeneratedLesson {
  title: string;
  description: string;
  contentType: "TEXT" | "VIDEO" | "QUIZ" | "MISSION" | "MIXED";
  durationMin: number;
  orderIndex: number;
  isAiGenerated: true;
  body: { sections: LessonSection[] };
  quiz: { questions: QuizQuestion[] } | null;
  flaggedForReview: boolean;
  reviewReason: string | null;
}

export interface GeneratedModule {
  title: string;
  description: string;
  orderIndex: number;
  lessons: GeneratedLesson[];
}

export interface GeneratedCourse {
  title: string;
  description: string;
  estimatedHours: number;
  riskLevel: "L1" | "L2" | "L3";
  modules: GeneratedModule[];
}

export interface ModuleSuggestion {
  suggestedTitle: string;
  suggestedDescription: string;
  estimatedHours: number;
  modules: {
    title: string;
    description: string;
    lessons: {
      title: string;
      contentType: string;
      durationMin: number;
      ldviPhase: "LEARN" | "DO" | "VERIFY" | "IMPROVE";
      description: string;
    }[];
  }[];
}

export interface GeneratedLessonContent {
  title: string;
  body: { sections: LessonSection[] };
  keyVocabulary: { term: string; definition: string }[];
  estimatedReadTimeMin: number;
}

// ─── Functions ──────────────────────────────────────────────────────────

/**
 * Build a complete course from a raw document.
 *
 * This is the main entry point. It sends the document to Claude
 * with instructions to break it into the L-D-V-I microlearning structure,
 * generate lesson content, quizzes, and flag high-risk content for review.
 */
export async function buildCourseFromDocument(
  documentText: string,
  config: CourseBuilderConfig
): Promise<GeneratedCourse> {
  const { targetLocale, riskLevel, maxModules = 10, maxLessonsPerModule = 8 } =
    config;

  const userPrompt = [
    `Convert the following document into a structured microlearning course.`,
    ``,
    `CONFIGURATION:`,
    `- Target language/locale: ${targetLocale}`,
    `- Risk level: ${riskLevel}`,
    `- Maximum modules: ${maxModules}`,
    `- Maximum lessons per module: ${maxLessonsPerModule}`,
    config.specialtyId
      ? `- Medical specialty ID: ${config.specialtyId}`
      : "",
    ``,
    `RISK LEVEL GUIDANCE for ${riskLevel}:`,
    riskLevel === "L1"
      ? `- General/orientation content. Flag only clearly clinical claims.`
      : riskLevel === "L2"
        ? `- Clinical procedures involved. Flag specific procedural steps and dosage information.`
        : `- HIGH RISK content (life-threatening procedures, medications). Flag ALL clinical assertions for expert review.`,
    ``,
    `SOURCE DOCUMENT:`,
    `---`,
    documentText.slice(0, 100_000), // Truncate to stay within context limits
    `---`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callClaudeJson<GeneratedCourse>({
    system: FULL_COURSE_BUILD_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 8_192,
    temperature: 0.3,
  });

  // Ensure AI-generated flag is set on all lessons
  for (const mod of result.modules) {
    for (const lesson of mod.lessons) {
      lesson.isAiGenerated = true;

      // Force review flag for L3 content
      if (riskLevel === "L3" && !lesson.flaggedForReview) {
        lesson.flaggedForReview = true;
        lesson.reviewReason =
          lesson.reviewReason ?? "L3 risk level — all content requires expert review.";
      }
    }
  }

  return result;
}

/**
 * Generate detailed lesson content for a specific topic within a course context.
 */
export async function generateLessonContent(
  topic: string,
  context: string,
  contentType: "TEXT" | "VIDEO" | "QUIZ" | "MISSION" | "MIXED"
): Promise<GeneratedLessonContent> {
  const userPrompt = [
    `Generate detailed lesson content for the following topic.`,
    ``,
    `TOPIC: ${topic}`,
    `CONTENT TYPE: ${contentType}`,
    ``,
    `COURSE CONTEXT:`,
    context.slice(0, 20_000),
  ].join("\n");

  return callClaudeJson<GeneratedLessonContent>({
    system: LESSON_CONTENT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4_096,
    temperature: 0.3,
  });
}

/**
 * Suggest how to break a document into modules and lessons
 * without generating full content. Useful for a preview step
 * before committing to a full build.
 */
export async function suggestModuleStructure(
  documentText: string
): Promise<ModuleSuggestion> {
  const userPrompt = [
    `Analyse the following document and suggest how to structure it as a microlearning course.`,
    `Do NOT generate lesson content — only the structure (module/lesson titles, types, durations).`,
    ``,
    `DOCUMENT:`,
    `---`,
    documentText.slice(0, 80_000),
    `---`,
  ].join("\n");

  return callClaudeJson<ModuleSuggestion>({
    system: COURSE_STRUCTURE_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4_096,
    temperature: 0.4,
  });
}
