/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/hydrate-scenes
 *
 * Convert script segments into VideoScene rows.
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { hydrateScenes } from "@/lib/services/scene-renderer.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const scenes = await hydrateScenes(jobId);

    return success({ scenes, count: scenes.length });
  } catch (error) {
    return handleError(error);
  }
}
