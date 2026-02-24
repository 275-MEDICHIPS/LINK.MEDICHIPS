/**
 * POST /api/v1/admin/video-production/bulk/cancel — Bulk cancel
 * POST /api/v1/admin/video-production/bulk/retry  — Bulk retry
 *
 * Note: Using a single route with action parameter for simplicity.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { cancelJob, retryJob } from "@/lib/services/video-production.service";

const schema = z.object({
  action: z.enum(["cancel", "retry"]),
  jobIds: z.array(z.string()).min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const { action, jobIds } = schema.parse(body);

    const results: { jobId: string; success: boolean; error?: string }[] = [];

    for (const jobId of jobIds) {
      try {
        if (action === "cancel") {
          await cancelJob(jobId, payload.sub);
        } else {
          await retryJob(jobId, payload.sub);
        }
        results.push({ jobId, success: true });
      } catch (error) {
        results.push({
          jobId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return success({
      action,
      total: jobIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    return handleError(error);
  }
}
