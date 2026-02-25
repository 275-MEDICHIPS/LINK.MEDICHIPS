import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  handleAuthError,
  AuthError,
} from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { batchCreateVideoJobs } from "@/lib/services/course-video.service";

const batchSchema = z.object({
  lessonIds: z.array(z.string()).min(1).max(50),
});

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");
    const { courseId } = await context.params;

    const body = await req.json();
    const { lessonIds } = batchSchema.parse(body);

    const result = await batchCreateVideoJobs(courseId, lessonIds, payload.sub);
    return success(result, 201);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
