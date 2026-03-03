/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/check-scenes
 *
 * Check if all scenes are done rendering, then merge if ready.
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { checkAndMergeScenes } from "@/lib/services/video-production.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const result = await checkAndMergeScenes(jobId);

    return success(result);
  } catch (error) {
    return handleError(error);
  }
}
