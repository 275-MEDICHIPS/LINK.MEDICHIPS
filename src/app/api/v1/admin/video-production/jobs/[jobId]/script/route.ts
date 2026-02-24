/**
 * PUT /api/v1/admin/video-production/jobs/[jobId]/script — Update script
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { ApiError } from "@/lib/utils/api-response";

const schema = z.object({
  title: z.string().min(1).optional(),
  rawScript: z.string().min(1).optional(),
  segments: z.array(z.object({
    speakerLabel: z.string(),
    text: z.string(),
    durationSec: z.number(),
    visualNotes: z.string().optional(),
  })).optional(),
  totalDurationSec: z.number().int().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const body = await req.json();
    const input = schema.parse(body);

    const job = await prisma.videoProductionJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
    if (!job.scriptId) {
      throw new ApiError("No script associated with this job", 400, "NO_SCRIPT");
    }

    const script = await prisma.videoScript.update({
      where: { id: job.scriptId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.rawScript && { rawScript: input.rawScript }),
        ...(input.segments && { segments: input.segments as unknown as object }),
        ...(input.totalDurationSec && { totalDurationSec: input.totalDurationSec }),
      },
    });

    return success(script);
  } catch (error) {
    return handleError(error);
  }
}
