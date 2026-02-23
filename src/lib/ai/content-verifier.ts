/**
 * L1 AI Content Verification for MEDICHIPS-LINK.
 *
 * Handles the AI-based verification layer (L1) of the L-D-V-I cycle:
 *   - verifyLessonCompletion: assess whether a user response demonstrates
 *     understanding of lesson material.
 *   - assessCompetency: aggregate quiz results, task evidence, and lesson
 *     progress into an overall competency assessment.
 */

import { callClaudeJson } from "./claude";

// ─── Types ──────────────────────────────────────────────────────────────

export type VerificationOutcome = "PASS" | "FAIL" | "CONDITIONAL";

export interface VerificationResult {
  result: VerificationOutcome;
  confidence: number; // 0.0 – 1.0
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestedReview: string[];
}

export interface QuizResultSummary {
  lessonId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
}

export interface TaskEvidenceSummary {
  taskId: string;
  title: string;
  status: string;
  hasEvidence: boolean;
  evidenceDescription?: string;
}

export interface LessonProgressSummary {
  lessonId: string;
  title: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  score: number | null;
  timeSpentSec: number;
}

export interface CompetencyAssessment {
  overallScore: number; // 0 – 100
  competencyLevel: "NOVICE" | "DEVELOPING" | "COMPETENT" | "PROFICIENT" | "EXPERT";
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  requiresSupervision: boolean;
  supplementaryLessons: string[];
}

// ─── System Prompts ─────────────────────────────────────────────────────

const LESSON_VERIFICATION_SYSTEM = `You are MEDICHIPS-LINK L1 Verification Engine.

Your job is to assess whether a learner's response demonstrates sufficient understanding
of the lesson material. This is the first (AI) layer of verification; human reviewers
handle L2 and L3.

ASSESSMENT CRITERIA:
1. Key concept coverage — does the response address the main points of the lesson?
2. Medical accuracy — are any medical claims correct?
3. Understanding depth — does the learner show comprehension beyond rote memorisation?
4. Application ability — can the learner apply knowledge to a scenario?

SCORING:
- PASS: Confidence >= 0.75, demonstrates solid understanding.
- CONDITIONAL: Confidence 0.50-0.74, shows partial understanding with gaps.
- FAIL: Confidence < 0.50, significant gaps or medical inaccuracies.

Be encouraging but honest. Highlight what the learner did well and what needs improvement.

Return a JSON object:
{
  "result": "PASS" | "FAIL" | "CONDITIONAL",
  "confidence": number,
  "feedback": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestedReview": ["string"]
}`;

const COMPETENCY_ASSESSMENT_SYSTEM = `You are MEDICHIPS-LINK Competency Assessor.

Evaluate a learner's overall competency for a course based on their aggregated
performance data: quiz scores, task completions, and lesson progress.

COMPETENCY LEVELS:
- NOVICE (0-20): Minimal understanding. Requires direct supervision for all tasks.
- DEVELOPING (21-40): Basic understanding with significant gaps. Close supervision needed.
- COMPETENT (41-60): Adequate understanding for routine tasks. Periodic supervision.
- PROFICIENT (61-80): Strong understanding. Can work independently on most tasks.
- EXPERT (81-100): Comprehensive mastery. Can teach and mentor others.

Consider:
1. Quiz performance (weight: 40%) — average scores, pass rates, attempts needed.
2. Task completion (weight: 30%) — evidence quality, task variety.
3. Lesson engagement (weight: 30%) — completion rate, time spent, consistency.

Return a JSON object:
{
  "overallScore": number,
  "competencyLevel": "NOVICE" | "DEVELOPING" | "COMPETENT" | "PROFICIENT" | "EXPERT",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "requiresSupervision": boolean,
  "supplementaryLessons": ["string"]
}`;

// ─── Functions ──────────────────────────────────────────────────────────

/**
 * Verify whether a user's response demonstrates understanding of a lesson.
 *
 * This is the L1 (AI) verification step. Results with low confidence or
 * CONDITIONAL/FAIL outcomes may trigger L2 (supervisor) review.
 *
 * @param lessonContent - The full lesson content the user studied.
 * @param userResponse  - The user's written response / answer.
 */
export async function verifyLessonCompletion(
  lessonContent: string,
  userResponse: string
): Promise<VerificationResult> {
  const userPrompt = [
    `Assess whether the learner's response demonstrates understanding of the lesson.`,
    ``,
    `LESSON CONTENT:`,
    `---`,
    lessonContent.slice(0, 20_000),
    `---`,
    ``,
    `LEARNER'S RESPONSE:`,
    `---`,
    userResponse.slice(0, 5_000),
    `---`,
    ``,
    `Evaluate understanding and provide constructive feedback.`,
  ].join("\n");

  return callClaudeJson<VerificationResult>({
    system: LESSON_VERIFICATION_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2_048,
    temperature: 0.2,
  });
}

/**
 * Perform an overall competency assessment for a learner in a course.
 *
 * Aggregates quiz results, task evidence, and lesson progress into
 * a holistic evaluation with recommendations.
 *
 * @param quizResults     - Summary of quiz attempts.
 * @param taskEvidence    - Summary of task submissions.
 * @param lessonProgress  - Summary of lesson completion.
 */
export async function assessCompetency(
  quizResults: QuizResultSummary[],
  taskEvidence: TaskEvidenceSummary[],
  lessonProgress: LessonProgressSummary[]
): Promise<CompetencyAssessment> {
  // Compute aggregate metrics for context
  const avgQuizScore =
    quizResults.length > 0
      ? quizResults.reduce((sum, q) => sum + q.score, 0) / quizResults.length
      : 0;
  const quizPassRate =
    quizResults.length > 0
      ? quizResults.filter((q) => q.passed).length / quizResults.length
      : 0;
  const completedLessons = lessonProgress.filter(
    (l) => l.status === "COMPLETED"
  ).length;
  const completionRate =
    lessonProgress.length > 0
      ? completedLessons / lessonProgress.length
      : 0;
  const tasksWithEvidence = taskEvidence.filter((t) => t.hasEvidence).length;
  const totalTimeMin = lessonProgress.reduce(
    (sum, l) => sum + l.timeSpentSec,
    0
  ) / 60;

  const userPrompt = [
    `Assess the learner's overall competency based on the following performance data.`,
    ``,
    `AGGREGATE METRICS:`,
    `- Average quiz score: ${(avgQuizScore * 100).toFixed(1)}%`,
    `- Quiz pass rate: ${(quizPassRate * 100).toFixed(1)}%`,
    `- Lesson completion rate: ${(completionRate * 100).toFixed(1)}%`,
    `- Tasks with evidence: ${tasksWithEvidence}/${taskEvidence.length}`,
    `- Total study time: ${totalTimeMin.toFixed(0)} minutes`,
    ``,
    `QUIZ RESULTS:`,
    JSON.stringify(quizResults, null, 2),
    ``,
    `TASK EVIDENCE:`,
    JSON.stringify(taskEvidence, null, 2),
    ``,
    `LESSON PROGRESS:`,
    JSON.stringify(lessonProgress, null, 2),
    ``,
    `Provide a holistic assessment with actionable recommendations.`,
  ].join("\n");

  return callClaudeJson<CompetencyAssessment>({
    system: COMPETENCY_ASSESSMENT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2_048,
    temperature: 0.2,
  });
}
