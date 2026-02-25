import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  handleAuthError,
  AuthError,
} from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getCourseVideoSettings,
  upsertCourseVideoSettings,
} from "@/lib/services/course-video.service";

const upsertSchema = z.object({
  avatarId: z.string().nullable().optional(),
  voicePresetId: z.string().nullable().optional(),
  speakerName: z.string().max(100).nullable().optional(),
  visualStyle: z.string().max(50).nullable().optional(),
  targetLocale: z.string().min(2).max(10).optional(),
  additionalInstructions: z.string().max(2000).nullable().optional(),
});

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    authenticate(req);
    const { courseId } = await context.params;
    const settings = await getCourseVideoSettings(courseId);
    return success(settings);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    authenticate(req);
    requireRole(authenticate(req), "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId } = await context.params;

    const body = await req.json();
    const data = upsertSchema.parse(body);

    const settings = await upsertCourseVideoSettings(courseId, data);
    return success(settings);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
