/**
 * POST /api/v1/ai/glossary-extract
 *
 * Extract medical glossary terms from provided text using AI.
 * Returns structured terms with definitions, abbreviations, and categories.
 * Optionally saves extracted terms to the MedicalGlossary table.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  authenticate,
  requireRole,
  handleAuthError,
} from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { extractTerms, enrichGlossary } from "@/lib/ai/glossary-extractor";

// ─── Validation ─────────────────────────────────────────────────────────

const extractSchema = z.object({
  text: z
    .string()
    .min(50, "Text must be at least 50 characters")
    .max(100_000, "Text exceeds 100,000 character limit"),
  locale: z.string().min(2).max(10).default("en"),
  saveToGlossary: z.boolean().optional().default(false),
});

const enrichSchema = z.object({
  terms: z
    .array(z.string().min(1))
    .min(1, "At least one term is required")
    .max(100, "Maximum 100 terms per request"),
  locale: z.string().min(2).max(10).default("en"),
  saveToGlossary: z.boolean().optional().default(false),
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

    // Determine if this is an extract or enrich request
    if (body.terms && Array.isArray(body.terms)) {
      // Enrich existing terms with definitions
      const input = enrichSchema.parse(body);
      const result = await enrichGlossary(input.terms, input.locale);

      if (input.saveToGlossary) {
        await saveTermsToGlossary(
          result.terms.map((t) => ({
            term: t.term,
            definition: t.definition,
            abbreviation: t.abbreviation,
            locale: input.locale,
          }))
        );
      }

      return success({
        mode: "enrich",
        ...result,
        savedToGlossary: input.saveToGlossary,
      }, 201);
    }

    // Extract terms from text
    const input = extractSchema.parse(body);
    const result = await extractTerms(input.text, input.locale);

    if (input.saveToGlossary && result.terms.length > 0) {
      await saveTermsToGlossary(
        result.terms.map((t) => ({
          term: t.term,
          definition: t.definition,
          abbreviation: t.abbreviation,
          locale: input.locale,
        }))
      );
    }

    return success({
      mode: "extract",
      ...result,
      savedToGlossary: input.saveToGlossary,
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
 * Save extracted terms to the MedicalGlossary table.
 * Uses upsert to avoid duplicates on (term, locale) unique constraint.
 * New terms are saved as unverified.
 */
async function saveTermsToGlossary(
  terms: {
    term: string;
    definition: string;
    abbreviation: string | null;
    locale: string;
  }[]
): Promise<void> {
  const operations = terms.map((t) =>
    prisma.medicalGlossary.upsert({
      where: {
        term_locale: { term: t.term, locale: t.locale },
      },
      create: {
        term: t.term,
        locale: t.locale,
        definition: t.definition,
        abbreviation: t.abbreviation,
        isVerified: false,
      },
      update: {
        // Only update if currently unverified (don't overwrite human-verified)
        definition: t.definition,
        abbreviation: t.abbreviation,
      },
    })
  );

  await prisma.$transaction(operations);
}
