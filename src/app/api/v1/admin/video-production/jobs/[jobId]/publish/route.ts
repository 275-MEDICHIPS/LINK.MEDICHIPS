/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/publish
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { publishToLesson } from "@/lib/services/video-production.service";

const schema = z.object({
  lessonId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const body = await req.json();
    const { lessonId } = schema.parse(body);

    const result = await publishToLesson(jobId, lessonId, payload.sub);
    return success(result, 201);
  } catch (error) {
    return handleError(error);
  }
}
