/**
 * POST /api/v1/ai/translate
 *
 * Translate medical content between locales.
 * Creates a TranslationJob record and returns the translation
 * with flagged low-confidence terms.
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
import {
  translateContent,
  verifyTranslation,
  type GlossaryEntry,
} from "@/lib/ai/translator";

// ─── Validation ─────────────────────────────────────────────────────────

const translateSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(100_000, "Text exceeds 100,000 character limit"),
  sourceLocale: z.string().min(2).max(10),
  targetLocale: z.string().min(2).max(10),
  entityType: z.string().optional().default("freeform"),
  entityId: z.string().optional(),
  verify: z.boolean().optional().default(false),
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
    const input = translateSchema.parse(body);

    // Look up glossary entries for the target locale
    const glossaryRows = await prisma.medicalGlossary.findMany({
      where: { locale: input.targetLocale, isVerified: true },
      select: {
        term: true,
        definition: true,
        locale: true,
        abbreviation: true,
      },
    });

    const glossary: GlossaryEntry[] = glossaryRows.map((g) => ({
      term: g.term,
      translation: g.definition,
      locale: g.locale,
      abbreviation: g.abbreviation ?? undefined,
    }));

    // Create the TranslationJob record
    const job = await prisma.translationJob.create({
      data: {
        sourceLocale: input.sourceLocale,
        targetLocale: input.targetLocale,
        entityType: input.entityType,
        entityId: input.entityId ?? "",
        status: "IN_PROGRESS",
        method: "ai",
        sourceText: input.text,
      },
    });

    try {
      // Run translation
      const translationResult = await translateContent(
        input.text,
        input.sourceLocale,
        input.targetLocale,
        glossary.length > 0 ? glossary : undefined
      );

      // Determine if terms need verification (low confidence)
      const hasLowConfidence = translationResult.flaggedTerms.some(
        (t) => t.confidence < 0.7
      );

      // Optionally verify the translation
      let verification = null;
      if (input.verify) {
        verification = await verifyTranslation(
          input.text,
          translationResult.translatedText,
          input.targetLocale
        );
      }

      // Update the TranslationJob
      await prisma.translationJob.update({
        where: { id: job.id },
        data: {
          status: hasLowConfidence ? "REVIEW" : "COMPLETED",
          translatedText: translationResult.translatedText,
          isVerified: false, // Always false until human reviews
        },
      });

      return success({
        jobId: job.id,
        translatedText: translationResult.translatedText,
        flaggedTerms: translationResult.flaggedTerms,
        metadata: translationResult.metadata,
        needsReview: hasLowConfidence,
        verification,
      }, 201);
    } catch (aiError) {
      // Mark job as failed
      await prisma.translationJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
      throw aiError;
    }
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
