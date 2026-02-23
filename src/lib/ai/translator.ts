/**
 * AI Medical Translation with terminology verification.
 *
 * Uses a glossary for consistent medical terminology and flags
 * low-confidence terms for human review.
 */

import { callClaudeJson } from "./claude";
import {
  MEDICAL_TRANSLATOR_SYSTEM,
  BATCH_TRANSLATOR_SYSTEM,
  TRANSLATION_VERIFIER_SYSTEM,
} from "./prompts/translator";

// ─── Types ──────────────────────────────────────────────────────────────

export interface GlossaryEntry {
  term: string;
  translation: string;
  locale: string;
  abbreviation?: string;
}

export interface FlaggedTerm {
  original: string;
  translated: string;
  confidence: number;
  context?: string;
  suggestion?: string;
}

export interface TranslationResult {
  translatedText: string;
  flaggedTerms: FlaggedTerm[];
  metadata: {
    sourceWordCount: number;
    targetWordCount: number;
    glossaryTermsUsed: number;
    flaggedTermCount: number;
  };
}

export interface BatchTranslationItem {
  id: string;
  text: string;
}

export interface BatchTranslationResult {
  translations: {
    id: string;
    translatedText: string;
    flaggedTerms: FlaggedTerm[];
  }[];
}

export interface TranslationVerification {
  overallScore: number;
  issues: {
    severity: "CRITICAL" | "MAJOR" | "MINOR";
    category:
      | "ACCURACY"
      | "COMPLETENESS"
      | "FLUENCY"
      | "TERMINOLOGY"
      | "CULTURAL";
    originalSegment: string;
    translatedSegment: string;
    suggestion: string;
    explanation: string;
  }[];
  summary: string;
  isAcceptable: boolean;
}

// ─── Functions ──────────────────────────────────────────────────────────

/**
 * Translate medical content from one locale to another.
 *
 * Uses the provided glossary to ensure consistent terminology.
 * Low-confidence terms (< 0.7) are flagged for human review.
 */
export async function translateContent(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  glossary?: GlossaryEntry[]
): Promise<TranslationResult> {
  const glossarySection =
    glossary && glossary.length > 0
      ? [
          ``,
          `GLOSSARY (you MUST use these translations for listed terms):`,
          ...glossary.map(
            (g) =>
              `- "${g.term}" -> "${g.translation}"${g.abbreviation ? ` (${g.abbreviation})` : ""}`
          ),
          ``,
        ].join("\n")
      : "";

  const userPrompt = [
    `Translate the following medical education content.`,
    ``,
    `SOURCE LANGUAGE: ${sourceLocale}`,
    `TARGET LANGUAGE: ${targetLocale}`,
    glossarySection,
    `TEXT TO TRANSLATE:`,
    `---`,
    text.slice(0, 50_000),
    `---`,
    ``,
    `Flag any terms where your confidence in the translation is below 0.7.`,
  ].join("\n");

  return callClaudeJson<TranslationResult>({
    system: MEDICAL_TRANSLATOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 8_192,
    temperature: 0.2,
  });
}

/**
 * Translate multiple text items in a single API call for efficiency.
 *
 * Best for translating many short strings (lesson titles, UI labels, etc.).
 */
export async function translateBatch(
  items: BatchTranslationItem[],
  sourceLocale: string,
  targetLocale: string,
  glossary?: GlossaryEntry[]
): Promise<BatchTranslationResult> {
  const glossarySection =
    glossary && glossary.length > 0
      ? [
          ``,
          `GLOSSARY:`,
          ...glossary.map(
            (g) =>
              `- "${g.term}" -> "${g.translation}"${g.abbreviation ? ` (${g.abbreviation})` : ""}`
          ),
          ``,
        ].join("\n")
      : "";

  // Batch in groups of 50 to stay within context limits
  const BATCH_SIZE = 50;
  const allTranslations: BatchTranslationResult["translations"] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const userPrompt = [
      `Translate the following batch of medical education texts.`,
      ``,
      `SOURCE LANGUAGE: ${sourceLocale}`,
      `TARGET LANGUAGE: ${targetLocale}`,
      glossarySection,
      `TEXTS TO TRANSLATE:`,
      `---`,
      JSON.stringify(batch, null, 2),
      `---`,
    ].join("\n");

    const result = await callClaudeJson<BatchTranslationResult>({
      system: BATCH_TRANSLATOR_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 8_192,
      temperature: 0.2,
    });

    allTranslations.push(...result.translations);
  }

  return { translations: allTranslations };
}

/**
 * Verify the quality of an existing translation.
 *
 * Checks medical accuracy, completeness, fluency, terminology consistency,
 * and cultural appropriateness.
 */
export async function verifyTranslation(
  original: string,
  translated: string,
  locale: string
): Promise<TranslationVerification> {
  const userPrompt = [
    `Assess the quality of the following medical translation.`,
    ``,
    `TARGET LOCALE: ${locale}`,
    ``,
    `ORIGINAL TEXT:`,
    `---`,
    original.slice(0, 30_000),
    `---`,
    ``,
    `TRANSLATED TEXT:`,
    `---`,
    translated.slice(0, 30_000),
    `---`,
    ``,
    `Identify any issues and rate the overall quality (0-100).`,
  ].join("\n");

  return callClaudeJson<TranslationVerification>({
    system: TRANSLATION_VERIFIER_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4_096,
    temperature: 0.2,
  });
}
