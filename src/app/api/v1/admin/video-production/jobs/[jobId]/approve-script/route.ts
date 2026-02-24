/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/approve-script
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { approveScript } from "@/lib/services/video-production.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const job = await approveScript(jobId, payload.sub);
    return success(job);
  } catch (error) {
    return handleError(error);
  }
}
