/**
 * Medical Glossary Extraction.
 *
 * Extracts medical terms, definitions, and abbreviations from text
 * using Claude. Also enriches bare term lists with definitions.
 */

import { callClaudeJson } from "./claude";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ExtractedTerm {
  term: string;
  definition: string;
  abbreviation: string | null;
  context: string;
  category?: string;
}

export interface ExtractionResult {
  terms: ExtractedTerm[];
  metadata: {
    sourceLength: number;
    termsFound: number;
    categoryCounts: Record<string, number>;
  };
}

export interface EnrichedTerm {
  term: string;
  definition: string;
  abbreviation: string | null;
  relatedTerms: string[];
  synonyms: string[];
}

export interface EnrichmentResult {
  terms: EnrichedTerm[];
}

// ─── System Prompts ─────────────────────────────────────────────────────

const GLOSSARY_EXTRACTOR_SYSTEM = `You are MEDICHIPS-LINK Glossary Extractor, a medical terminology expert.

Extract medical and healthcare-specific terms from the provided text.

For each term provide:
1. The exact term as it appears (normalised to standard casing).
2. A clear, concise definition suitable for healthcare workers in developing countries (B1 English).
3. The standard abbreviation if one exists (e.g. CPR, WHO, IV).
4. A short context snippet showing how the term is used in the source.
5. A category: ANATOMY, PHYSIOLOGY, PATHOLOGY, PHARMACOLOGY, PROCEDURE, EQUIPMENT, GENERAL_MEDICAL, PUBLIC_HEALTH, or OTHER.

Do NOT extract:
- Common everyday words that are not medical
- Proper nouns (doctor names, hospital names)
- Brand names (use generic drug names instead)

Return a JSON object:
{
  "terms": [
    {
      "term": "string",
      "definition": "string",
      "abbreviation": "string" | null,
      "context": "string",
      "category": "string"
    }
  ],
  "metadata": {
    "sourceLength": number,
    "termsFound": number,
    "categoryCounts": { "CATEGORY": number }
  }
}`;

const GLOSSARY_ENRICHER_SYSTEM = `You are MEDICHIPS-LINK Glossary Enricher, a medical terminology expert.

Given a list of medical terms, provide:
1. A clear, concise definition for each (B1 English level).
2. The standard abbreviation if one exists.
3. Related medical terms (up to 5).
4. Common synonyms.

Return a JSON object:
{
  "terms": [
    {
      "term": "string",
      "definition": "string",
      "abbreviation": "string" | null,
      "relatedTerms": ["string"],
      "synonyms": ["string"]
    }
  ]
}`;

// ─── Functions ──────────────────────────────────────────────────────────

/**
 * Extract medical terms with definitions and abbreviations from text.
 *
 * @param text   - Source text to extract terms from.
 * @param locale - Language of the source text (ISO code, e.g. "en", "ko").
 */
export async function extractTerms(
  text: string,
  locale: string
): Promise<ExtractionResult> {
  const userPrompt = [
    `Extract all medical and healthcare-specific terms from the following text.`,
    ``,
    `SOURCE LANGUAGE: ${locale}`,
    ``,
    `TEXT:`,
    `---`,
    text.slice(0, 50_000),
    `---`,
    ``,
    `Extract terms in the source language (${locale}).`,
    `Provide definitions in ${locale}.`,
  ].join("\n");

  return callClaudeJson<ExtractionResult>({
    system: GLOSSARY_EXTRACTOR_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4_096,
    temperature: 0.2,
  });
}

/**
 * Add definitions, abbreviations, and related terms to a bare list of terms.
 *
 * @param terms  - Array of medical terms (strings only, no definitions).
 * @param locale - Language for definitions (ISO code).
 */
export async function enrichGlossary(
  terms: string[],
  locale: string
): Promise<EnrichmentResult> {
  // Process in batches of 30 to stay within token limits
  const BATCH_SIZE = 30;
  const allEnriched: EnrichedTerm[] = [];

  for (let i = 0; i < terms.length; i += BATCH_SIZE) {
    const batch = terms.slice(i, i + BATCH_SIZE);

    const userPrompt = [
      `Enrich the following medical terms with definitions and related information.`,
      ``,
      `LANGUAGE: ${locale}`,
      ``,
      `TERMS:`,
      ...batch.map((t, idx) => `${idx + 1}. ${t}`),
      ``,
      `Provide definitions in ${locale}.`,
    ].join("\n");

    const result = await callClaudeJson<EnrichmentResult>({
      system: GLOSSARY_ENRICHER_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 4_096,
      temperature: 0.2,
    });

    allEnriched.push(...result.terms);
  }

  return { terms: allEnriched };
}
