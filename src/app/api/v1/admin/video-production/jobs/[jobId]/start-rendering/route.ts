/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/start-rendering
 *
 * Start AI rendering for all scenes.
 * Transitions SCENE_SETUP → SCENE_RENDERING.
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { startSceneRendering } from "@/lib/services/video-production.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const result = await startSceneRendering(jobId, payload.sub);

    return success(result);
  } catch (error) {
    return handleError(error);
  }
}
