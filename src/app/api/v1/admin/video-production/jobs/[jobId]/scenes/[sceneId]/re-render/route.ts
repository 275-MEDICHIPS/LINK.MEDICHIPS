/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/scenes/[sceneId]/re-render
 *
 * Re-render a single scene (increments version, re-submits to provider).
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { reRenderScene } from "@/lib/services/scene-renderer.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; sceneId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { sceneId } = await params;
    const scene = await reRenderScene(sceneId);

    return success(scene);
  } catch (error) {
    return handleError(error);
  }
}
