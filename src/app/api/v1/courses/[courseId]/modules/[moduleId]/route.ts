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
  getModule,
  updateModule,
  deleteModule,
} from "@/lib/services/course.service";
import { prisma } from "@/lib/db/prisma";

// ─── Schemas ─────────────────────────────────────────────────────────

const updateModuleSchema = z.object({
  locale: z.string().min(2).max(10).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
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

// ─── GET /api/v1/courses/:courseId/modules/:moduleId ─────────────────

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    const { courseId, moduleId } = await context.params;

    const mod = await verifyModuleOwnership(courseId, moduleId);
    requireOrg(payload, mod.course.organizationId);

    const locale =
      req.nextUrl.searchParams.get("locale") ?? "en";

    const fullModule = await getModule(moduleId, locale);

    return success(fullModule);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── PATCH /api/v1/courses/:courseId/modules/:moduleId ───────────────

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId, moduleId } = await context.params;

    const mod = await verifyModuleOwnership(courseId, moduleId);
    requireOrg(payload, mod.course.organizationId);

    const body = await req.json();
    const data = updateModuleSchema.parse(body);

    const updated = await updateModule(moduleId, data);

    return success(updated);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── DELETE /api/v1/courses/:courseId/modules/:moduleId ──────────────

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { courseId, moduleId } = await context.params;

    const mod = await verifyModuleOwnership(courseId, moduleId);
    requireOrg(payload, mod.course.organizationId);

    await deleteModule(moduleId);

    return success({ deleted: true });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
