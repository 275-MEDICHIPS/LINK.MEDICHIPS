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
  listModules,
  createModule,
} from "@/lib/services/course.service";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";

// ─── Schemas ─────────────────────────────────────────────────────────

const createModuleSchema = z.object({
  locale: z.string().min(2).max(10),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

// ─── Helpers ─────────────────────────────────────────────────────────

async function verifyCourseOwnership(courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }
  return course;
}

// ─── GET /api/v1/courses/:courseId/modules ────────────────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    const { courseId } = await context.params;

    const course = await verifyCourseOwnership(courseId);
    requireOrg(payload, course.organizationId);

    const locale =
      req.nextUrl.searchParams.get("locale") ?? "en";

    const modules = await listModules(courseId, locale);

    return success(modules);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── POST /api/v1/courses/:courseId/modules ──────────────────────────

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId } = await context.params;

    const course = await verifyCourseOwnership(courseId);
    requireOrg(payload, course.organizationId);

    const body = await req.json();
    const data = createModuleSchema.parse(body);

    const mod = await createModule(courseId, data);

    return success(mod, 201);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
