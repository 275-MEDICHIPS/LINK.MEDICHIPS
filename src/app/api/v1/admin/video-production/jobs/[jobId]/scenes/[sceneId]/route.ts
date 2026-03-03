/**
 * GET   /api/v1/admin/video-production/jobs/[jobId]/scenes/[sceneId] — Scene detail
 * PATCH /api/v1/admin/video-production/jobs/[jobId]/scenes/[sceneId] — Update scene
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getScene,
  updateScene,
  pollSceneRenderStatus,
} from "@/lib/services/scene-renderer.service";

const updateSceneSchema = z.object({
  source: z.enum(["DOCTOR_VIDEO", "AI_GENERATED", "STOCK_FOOTAGE", "HYBRID"]).optional(),
  text: z.string().optional(),
  visualNotes: z.string().optional(),
  durationSec: z.number().min(1).max(60).optional(),
  speakerLabel: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; sceneId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { sceneId } = await params;

    // Poll render status if scene has an external job
    const scene = await pollSceneRenderStatus(sceneId);
    return success(scene);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; sceneId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { sceneId } = await params;
    const body = await req.json();
    const input = updateSceneSchema.parse(body);

    const scene = await updateScene(sceneId, input);
    return success(scene);
  } catch (error) {
    return handleError(error);
  }
}
