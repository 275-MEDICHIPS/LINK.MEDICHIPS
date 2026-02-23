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
    const lessonId = url.searchParams.get("lessonId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (lessonId) where.lessonId = lessonId;
    if (status) where.status = status;

    const [versions, total] = await Promise.all([
      prisma.contentVersion.findMany({
        where,
        include: {
          lesson: { include: { translations: { where: { locale: "en" }, take: 1 } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentVersion.count({ where }),
    ]);

    return paginated(versions, total, page, limit);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

const createVersionSchema = z.object({
  lessonId: z.string().uuid(),
  body: z.unknown(),
  previousVersionId: z.string().uuid().optional(),
  isAiGenerated: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");

    const body = await req.json();
    const data = createVersionSchema.parse(body);

    const latestVersion = await prisma.contentVersion.findFirst({
      where: { lessonId: data.lessonId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latestVersion?.version ?? 0) + 1;

    const version = await prisma.contentVersion.create({
      data: {
        lessonId: data.lessonId,
        version: nextVersion,
        body: data.body as object,
        previousVersionId: data.previousVersionId,
        isAiGenerated: data.isAiGenerated,
        status: "DRAFT",
      },
    });

    // Log the action
    await prisma.contentAuditLog.create({
      data: {
        entityType: "ContentVersion",
        entityId: version.id,
        userId: payload.sub,
        action: "VERSION_CREATED",
        newState: { isAiGenerated: data.isAiGenerated },
      },
    });

    return success(version, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
