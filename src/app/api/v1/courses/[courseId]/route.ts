import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  requireOrg,
  handleAuthError,
  AuthError,
} from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
} from "@/lib/services/course.service";
import { prisma } from "@/lib/db/prisma";

// ─── Schemas ─────────────────────────────────────────────────────────

const updateCourseSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  riskLevel: z.enum(["L1", "L2", "L3"]).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  estimatedHours: z.number().positive().nullable().optional(),
  status: z
    .enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  publish: z.boolean().optional(),
  // Translation fields
  locale: z.string().min(2).max(10).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
});

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

// ─── GET /api/v1/courses/:courseId ───────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    const { courseId } = await context.params;

    const locale =
      req.nextUrl.searchParams.get("locale") ?? "en";

    const course = await getCourse(courseId, locale);
    requireOrg(payload, course.organizationId);

    return success(course);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── PATCH /api/v1/courses/:courseId ─────────────────────────────────

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId } = await context.params;

    // Verify course ownership
    const existing = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!existing) {
      return handleError(
        new (await import("@/lib/utils/api-response")).ApiError(
          "Course not found",
          404
        )
      );
    }
    requireOrg(payload, existing.organizationId);

    const body = await req.json();
    const data = updateCourseSchema.parse(body);

    // Handle publish action separately
    if (data.publish) {
      const published = await publishCourse(courseId);
      return success(published);
    }

    const { publish: _, locale, title, description, ...updateData } = data;

    // Update translation if title/description provided
    if (locale && (title || description !== undefined)) {
      await prisma.courseTranslation.upsert({
        where: { courseId_locale: { courseId, locale } },
        create: { courseId, locale, title: title ?? "", description },
        update: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
        },
      });
    }

    const updated = await updateCourse(courseId, updateData);

    return success(updated);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── DELETE /api/v1/courses/:courseId ─────────────────────────────────

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { courseId } = await context.params;

    // Verify course ownership
    const existing = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!existing) {
      return handleError(
        new (await import("@/lib/utils/api-response")).ApiError(
          "Course not found",
          404
        )
      );
    }
    requireOrg(payload, existing.organizationId);

    await deleteCourse(courseId);

    return success({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
