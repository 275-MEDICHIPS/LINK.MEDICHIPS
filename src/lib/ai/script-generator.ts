/**
 * AI Video Script Generator — uses Claude to generate video scripts.
 *
 * Follows the same pattern as course-builder.ts, using callClaudeJson().
 */

import { callClaudeJson } from "./claude";
import { VIDEO_SCRIPT_SYSTEM } from "./prompts/script-generator";

// ─── Types ──────────────────────────────────────────────────────────────

export interface CourseContext {
  courseTitle: string;
  courseDescription: string;
  moduleName: string;
  lessonIndex: number;
  totalLessons: number;
  previousLessonTopics: string[];
  sharedSpeakerName?: string;
  sharedVisualStyle?: string;
}

export interface ScriptGenerationInput {
  topic: string;
  lessonContext?: string;
  targetLocale?: string;
  riskLevel?: "L1" | "L2" | "L3";
  targetDurationSec?: number;
  speakerName?: string;
  additionalInstructions?: string;
  courseContext?: CourseContext;
}

export interface GeneratedScriptSegment {
  speakerLabel: string;
  text: string;
  durationSec: number;
  visualNotes?: string;
}

export interface GeneratedScript {
  title: string;
  segments: GeneratedScriptSegment[];
  totalDurationSec: number;
  keyTerms: { term: string; definition: string }[];
  flaggedForReview: boolean;
  reviewReasons: string[];
}

// ─── Main function ──────────────────────────────────────────────────────

/**
 * Generate a video script using Claude.
 */
export async function generateVideoScript(
  input: ScriptGenerationInput
): Promise<GeneratedScript> {
  const {
    topic,
    lessonContext,
    targetLocale = "en",
    riskLevel = "L1",
    targetDurationSec = 180,
    speakerName,
    additionalInstructions,
    courseContext,
  } = input;

  // Build course context section if available
  const courseContextSection = courseContext
    ? [
        `COURSE CONTEXT:`,
        `- Course: "${courseContext.courseTitle}"`,
        courseContext.courseDescription
          ? `- Description: ${courseContext.courseDescription.slice(0, 500)}`
          : "",
        `- Module: "${courseContext.moduleName}"`,
        `- This is lesson ${courseContext.lessonIndex} of ${courseContext.totalLessons} in this course`,
        courseContext.previousLessonTopics.length > 0
          ? `- Previous lessons covered: ${courseContext.previousLessonTopics.map((t) => `"${t}"`).join(", ")}`
          : "",
        `- Maintain consistent tone and character with previous lessons`,
        courseContext.sharedSpeakerName
          ? `- Speaker: ${courseContext.sharedSpeakerName} (consistent across all course videos)`
          : "",
        courseContext.sharedVisualStyle
          ? `- Visual style: ${courseContext.sharedVisualStyle}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const userPrompt = [
    `Generate a video script for the following medical education topic.`,
    ``,
    `TOPIC: ${topic}`,
    `TARGET DURATION: ${targetDurationSec} seconds (~${Math.round(targetDurationSec / 60)} minutes)`,
    `LANGUAGE/LOCALE: ${targetLocale}`,
    `RISK LEVEL: ${riskLevel}`,
    speakerName ? `SPEAKER NAME: ${speakerName}` : "",
    ``,
    riskLevel === "L3"
      ? `WARNING: This is L3 (high-risk) content. Mark ALL clinical instructions with [VERIFY] for expert review. Set flaggedForReview to true.`
      : riskLevel === "L2"
        ? `NOTE: This is L2 (medium-risk) content. Include safety precautions prominently. Flag specific procedural steps.`
        : `NOTE: This is L1 (low-risk) content. Standard script with general knowledge.`,
    ``,
    courseContextSection ? `\n${courseContextSection}\n` : "",
    lessonContext
      ? `LESSON CONTEXT:\n${lessonContext.slice(0, 20_000)}`
      : "",
    additionalInstructions
      ? `\nADDITIONAL INSTRUCTIONS:\n${additionalInstructions}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callClaudeJson<GeneratedScript>({
    system: VIDEO_SCRIPT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4_096,
    temperature: 0.3,
  });

  // Force review flag for L3 content
  if (riskLevel === "L3" && !result.flaggedForReview) {
    result.flaggedForReview = true;
    result.reviewReasons = result.reviewReasons || [];
    if (!result.reviewReasons.length) {
      result.reviewReasons.push(
        "L3 risk level — all content requires expert review."
      );
    }
  }

  return result;
}
