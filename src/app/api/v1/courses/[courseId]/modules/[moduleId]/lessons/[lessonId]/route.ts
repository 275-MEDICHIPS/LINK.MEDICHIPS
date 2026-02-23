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
  getLesson,
  updateLesson,
  deleteLesson,
} from "@/lib/services/course.service";
import { prisma } from "@/lib/db/prisma";

// ─── Schemas ─────────────────────────────────────────────────────────

const updateLessonSchema = z.object({
  locale: z.string().min(2).max(10).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  contentType: z
    .enum(["VIDEO", "AUDIO", "TEXT", "QUIZ", "MISSION", "MIXED"])
    .optional(),
  durationMin: z.number().int().positive().nullable().optional(),
  isRequired: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
  body: z.unknown().optional(),
  isAiGenerated: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{
    courseId: string;
    moduleId: string;
    lessonId: string;
  }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function verifyLessonOwnership(
  courseId: string,
  moduleId: string,
  lessonId: string
) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      moduleId,
      deletedAt: null,
      module: {
        courseId,
        deletedAt: null,
      },
    },
    include: {
      module: {
        include: { course: true },
      },
    },
  });
  if (!lesson) {
    throw new ApiError(
      "Lesson not found in this module/course",
      404,
      "LESSON_NOT_FOUND"
    );
  }
  return lesson;
}

// ─── GET /api/v1/courses/:courseId/modules/:moduleId/lessons/:lessonId

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    const { courseId, moduleId, lessonId } = await context.params;

    const owned = await verifyLessonOwnership(courseId, moduleId, lessonId);
    requireOrg(payload, owned.module.course.organizationId);

    const locale =
      req.nextUrl.searchParams.get("locale") ?? "en";

    const lesson = await getLesson(lessonId, locale);

    return success(lesson);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── PATCH /api/v1/courses/:courseId/modules/:moduleId/lessons/:lessonId

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId, moduleId, lessonId } = await context.params;

    const owned = await verifyLessonOwnership(courseId, moduleId, lessonId);
    requireOrg(payload, owned.module.course.organizationId);

    const body = await req.json();
    const data = updateLessonSchema.parse(body);

    const updated = await updateLesson(lessonId, data);

    return success(updated);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── DELETE /api/v1/courses/:courseId/modules/:moduleId/lessons/:lessonId

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { courseId, moduleId, lessonId } = await context.params;

    const owned = await verifyLessonOwnership(courseId, moduleId, lessonId);
    requireOrg(payload, owned.module.course.organizationId);

    await deleteLesson(lessonId);

    return success({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
