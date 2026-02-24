/**
 * GET  /api/v1/admin/video-production/jobs — List video production jobs
 * POST /api/v1/admin/video-production/jobs — Create a new job
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";
import { createJob, listJobs } from "@/lib/services/video-production.service";

const createJobSchema = z.object({
  method: z.enum(["AI_GENERATED", "FACE_SWAP"]),
  provider: z.enum(["SYNTHESIA", "HEYGEN", "AKOOL", "WAVESPEED_AI"]),
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  sourceVideoUrl: z.string().url().optional(),
  sourceVideoGcsPath: z.string().optional(),
  faceSwapConfig: z
    .object({
      targetFaceImageUrl: z.string().url().optional(),
      faceMapping: z.record(z.string()).optional(),
      blurOriginalFaces: z.boolean().optional(),
      preserveExpressions: z.boolean().optional(),
      resolution: z.string().optional(),
      fidelityLevel: z.string().optional(),
    })
    .optional(),
});

const listJobsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  method: z.enum(["AI_GENERATED", "FACE_SWAP"]).optional(),
  status: z
    .enum([
      "DRAFT", "SCRIPT_GENERATING", "SCRIPT_REVIEW", "QUEUED",
      "RENDERING", "FACE_SWAPPING", "POST_PROCESSING", "REVIEW",
      "COMPLETED", "FAILED", "CANCELLED",
    ])
    .optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const filters = listJobsSchema.parse(params);
    const { jobs, total, page, pageSize } = await listJobs(filters);

    return paginated(jobs, total, page, pageSize);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = createJobSchema.parse(body);
    const job = await createJob(input, payload.sub);

    return success(job, 201);
  } catch (error) {
    return handleError(error);
  }
}
