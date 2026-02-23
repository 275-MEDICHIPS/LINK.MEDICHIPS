/**
 * /api/v1/glossary
 *
 * GET:   Search glossary terms (by term, locale). Public for authenticated users.
 * POST:  Add a glossary term (INSTRUCTOR or higher).
 * PATCH: Verify or update a glossary term (ORG_ADMIN or higher).
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  authenticate,
  requireRole,
  handleAuthError,
} from "@/lib/auth/guards";
import {
  success,
  paginated,
  handleError,
  ApiError,
} from "@/lib/utils/api-response";

// ─── Validation ─────────────────────────────────────────────────────────

const createTermSchema = z.object({
  term: z.string().min(1).max(200),
  locale: z.string().min(2).max(10),
  definition: z.string().min(1).max(2_000),
  abbreviation: z.string().max(20).optional(),
});

const updateTermSchema = z.object({
  id: z.string().min(1, "Term ID is required"),
  definition: z.string().min(1).max(2_000).optional(),
  abbreviation: z.string().max(20).nullish(),
  isVerified: z.boolean().optional(),
});

// ─── GET: Search glossary terms ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const { searchParams } = new URL(req.url);
    const term = searchParams.get("term") ?? undefined;
    const locale = searchParams.get("locale") ?? undefined;
    const verified = searchParams.get("verified"); // "true" | "false" | null
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10))
    );

    const where: Record<string, unknown> = {};

    if (term) {
      where.term = { contains: term, mode: "insensitive" };
    }
    if (locale) {
      where.locale = locale;
    }
    if (verified === "true") {
      where.isVerified = true;
    } else if (verified === "false") {
      where.isVerified = false;
    }

    const [terms, total] = await prisma.$transaction([
      prisma.medicalGlossary.findMany({
        where,
        orderBy: { term: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.medicalGlossary.count({ where }),
    ]);

    // Suppress unused variable warning — payload is used for auth
    void payload;

    return paginated(terms, total, page, pageSize);
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

// ─── POST: Add glossary term ────────────────────────────────────────────

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
    const input = createTermSchema.parse(body);

    // Check for duplicate
    const existing = await prisma.medicalGlossary.findUnique({
      where: {
        term_locale: { term: input.term, locale: input.locale },
      },
    });

    if (existing) {
      throw new ApiError(
        `Glossary term "${input.term}" already exists for locale "${input.locale}"`,
        409,
        "TERM_EXISTS"
      );
    }

    const term = await prisma.medicalGlossary.create({
      data: {
        term: input.term,
        locale: input.locale,
        definition: input.definition,
        abbreviation: input.abbreviation ?? null,
        isVerified: false,
      },
    });

    return success(term, 201);
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

// ─── PATCH: Verify / update glossary term ───────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = updateTermSchema.parse(body);

    const existing = await prisma.medicalGlossary.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new ApiError("Glossary term not found", 404, "TERM_NOT_FOUND");
    }

    const updated = await prisma.medicalGlossary.update({
      where: { id: input.id },
      data: {
        ...(input.definition !== undefined && {
          definition: input.definition,
        }),
        ...(input.abbreviation !== undefined && {
          abbreviation: input.abbreviation,
        }),
        ...(input.isVerified !== undefined && {
          isVerified: input.isVerified,
          verifiedBy: input.isVerified ? payload.sub : null,
        }),
      },
    });

    return success(updated);
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
