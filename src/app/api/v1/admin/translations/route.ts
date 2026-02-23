import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const status = url.searchParams.get("status");
    const targetLocale = url.searchParams.get("locale");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (targetLocale) where.targetLocale = targetLocale;

    const [jobs, total] = await Promise.all([
      prisma.translationJob.findMany({
        where,
        select: {
          id: true,
          sourceLocale: true,
          targetLocale: true,
          entityType: true,
          entityId: true,
          status: true,
          method: true,
          sourceText: true,
          translatedText: true,
          isVerified: true,
          verifiedBy: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.translationJob.count({ where }),
    ]);

    return paginated(jobs, total, page, limit);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

const createTranslationSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  sourceLocale: z.string().min(2).max(5),
  targetLocale: z.string().min(2).max(5),
  sourceText: z.string().min(1),
  method: z.string().default("ai"),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");

    const body = await req.json();
    const data = createTranslationSchema.parse(body);

    const job = await prisma.translationJob.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        sourceLocale: data.sourceLocale,
        targetLocale: data.targetLocale,
        sourceText: data.sourceText,
        method: data.method,
        status: "PENDING",
      },
    });

    return success(job, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
