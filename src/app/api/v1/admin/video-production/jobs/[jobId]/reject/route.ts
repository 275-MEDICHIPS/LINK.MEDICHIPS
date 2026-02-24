/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/reject
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { rejectVideo } from "@/lib/services/video-production.service";

const schema = z.object({
  reason: z.string().min(1).max(2000),
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
    const { reason } = schema.parse(body);

    const job = await rejectVideo(jobId, payload.sub, reason);
    return success(job);
  } catch (error) {
    return handleError(error);
  }
}
