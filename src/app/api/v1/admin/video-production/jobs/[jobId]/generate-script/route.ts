/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/generate-script
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { generateScript } from "@/lib/services/video-production.service";

const schema = z.object({
  topic: z.string().min(5).max(10_000),
  lessonContext: z.string().max(50_000).optional(),
  targetLocale: z.string().min(2).max(10).default("en"),
  riskLevel: z.enum(["L1", "L2", "L3"]).default("L1"),
  targetDurationSec: z.number().int().min(30).max(1800).default(180),
  speakerName: z.string().optional(),
  additionalInstructions: z.string().max(5_000).optional(),
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
    const input = schema.parse(body);

    const result = await generateScript(jobId, input, payload.sub);
    return success(result, 201);
  } catch (error) {
    return handleError(error);
  }
}
