/**
 * GET  /api/v1/admin/video-production/jobs/[jobId]/scenes — List scenes
 * POST /api/v1/admin/video-production/jobs/[jobId]/scenes — Reorder scenes
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getScenesByJob,
  reorderScenes,
  getJobCostSummary,
} from "@/lib/services/scene-renderer.service";

const reorderSchema = z.object({
  sceneOrder: z.array(z.string()),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const scenes = await getScenesByJob(jobId);
    const costSummary = await getJobCostSummary(jobId);

    return success({ scenes, costSummary });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const body = await req.json();
    const { sceneOrder } = reorderSchema.parse(body);

    const scenes = await reorderScenes(jobId, sceneOrder);
    return success({ scenes });
  } catch (error) {
    return handleError(error);
  }
}
