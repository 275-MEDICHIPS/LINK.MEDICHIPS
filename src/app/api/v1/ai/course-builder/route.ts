/**
 * POST /api/v1/ai/course-builder
 *
 * Upload document text and get an AI-structured course draft.
 * Requires INSTRUCTOR or higher role.
 *
 * Creates an AiCourseJob record, runs the AI pipeline, and stores
 * the result as an AiGeneratedDraft.
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
  buildCourseFromDocument,
  suggestModuleStructure,
} from "@/lib/ai/course-builder";

// ─── Validation ─────────────────────────────────────────────────────────

const buildCourseSchema = z.object({
  documentText: z
    .string()
    .min(100, "Document must be at least 100 characters")
    .max(200_000, "Document exceeds 200,000 character limit"),
  targetLocale: z.string().min(2).max(10).default("en"),
  riskLevel: z.enum(["L1", "L2", "L3"]).default("L1"),
  specialtyId: z.string().optional(),
  courseId: z.string().optional(),
  mode: z.enum(["full", "structure"]).default("full"),
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
    const input = buildCourseSchema.parse(body);

    // Create the AiCourseJob record
    const job = await prisma.aiCourseJob.create({
      data: {
        courseId: input.courseId ?? null,
        status: "PROCESSING",
        config: {
          targetLocale: input.targetLocale,
          riskLevel: input.riskLevel,
          specialtyId: input.specialtyId,
          mode: input.mode,
          requestedBy: payload.sub,
        },
        startedAt: new Date(),
        sourceDocuments: {
          create: {
            fileName: "uploaded-document.txt",
            fileUrl: "",
            fileType: "text/plain",
            content: input.documentText,
          },
        },
      },
    });

    try {
      let result: unknown;

      if (input.mode === "structure") {
        // Preview-only: suggest module structure without full content
        result = await suggestModuleStructure(input.documentText);
      } else {
        // Full build: generate complete course with lessons and quizzes
        result = await buildCourseFromDocument(input.documentText, {
          targetLocale: input.targetLocale,
          riskLevel: input.riskLevel,
          specialtyId: input.specialtyId,
        });
      }

      // Store the generated draft
      await prisma.aiGeneratedDraft.create({
        data: {
          jobId: job.id,
          entityType: input.mode === "structure" ? "course_structure" : "course",
          content: result as object,
          confidence: input.riskLevel === "L3" ? 0.5 : input.riskLevel === "L2" ? 0.7 : 0.85,
        },
      });

      // Mark job as completed
      await prisma.aiCourseJob.update({
        where: { id: job.id },
        data: {
          status: "REVIEW",
          completedAt: new Date(),
        },
      });

      return success({
        jobId: job.id,
        status: "REVIEW",
        mode: input.mode,
        result,
      }, 201);
    } catch (aiError) {
      // Mark job as failed
      await prisma.aiCourseJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage:
            aiError instanceof Error ? aiError.message : "Unknown AI error",
          completedAt: new Date(),
        },
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
