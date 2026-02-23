import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  requireOrg,
  handleAuthError,
  AuthError,
} from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";
import {
  listLessons,
  createLesson,
} from "@/lib/services/course.service";
import { prisma } from "@/lib/db/prisma";

// ─── Schemas ─────────────────────────────────────────────────────────

const createLessonSchema = z.object({
  locale: z.string().min(2).max(10),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  contentType: z.enum([
    "VIDEO",
    "AUDIO",
    "TEXT",
    "QUIZ",
    "MISSION",
    "MIXED",
  ]),
  durationMin: z.number().int().positive().optional(),
  isRequired: z.boolean().optional(),
  body: z.record(z.unknown()),
  isAiGenerated: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ courseId: string; moduleId: string }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function verifyModuleOwnership(courseId: string, moduleId: string) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, courseId, deletedAt: null },
    include: { course: true },
  });
  if (!mod) {
    throw new ApiError(
      "Module not found in this course",
      404,
      "MODULE_NOT_FOUND"
    );
  }
  return mod;
}

// ─── GET /api/v1/courses/:courseId/modules/:moduleId/lessons ─────────

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    const { courseId, moduleId } = await context.params;

    const mod = await verifyModuleOwnership(courseId, moduleId);
    requireOrg(payload, mod.course.organizationId);

    const locale =
      req.nextUrl.searchParams.get("locale") ?? "en";

    const lessons = await listLessons(moduleId, locale);

    return success(lessons);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── POST /api/v1/courses/:courseId/modules/:moduleId/lessons ────────

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId, moduleId } = await context.params;

    const mod = await verifyModuleOwnership(courseId, moduleId);
    requireOrg(payload, mod.course.organizationId);

    const body = await req.json();
    const data = createLessonSchema.parse(body);

    const lesson = await createLesson(moduleId, data);

    return success(lesson, 201);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
