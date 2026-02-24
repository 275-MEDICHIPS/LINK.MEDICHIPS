/**
 * GET    /api/v1/admin/video-production/jobs/[jobId] — Job detail
 * PATCH  /api/v1/admin/video-production/jobs/[jobId] — Update job
 * DELETE /api/v1/admin/video-production/jobs/[jobId] — Delete job
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getJobDetail } from "@/lib/services/video-production.service";

const updateJobSchema = z.object({
  config: z.record(z.unknown()).optional(),
  sourceVideoUrl: z.string().url().optional(),
  sourceVideoGcsPath: z.string().optional(),
  lessonId: z.string().optional(),
  courseId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const job = await getJobDetail(jobId);
    return success(job);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;
    const body = await req.json();
    const input = updateJobSchema.parse(body);

    const data: Record<string, unknown> = {};
    if (input.config !== undefined) data.config = input.config;
    if (input.sourceVideoUrl !== undefined) data.sourceVideoUrl = input.sourceVideoUrl;
    if (input.sourceVideoGcsPath !== undefined) data.sourceVideoGcsPath = input.sourceVideoGcsPath;
    if (input.lessonId !== undefined) data.lesson = { connect: { id: input.lessonId } };
    if (input.courseId !== undefined) data.course = { connect: { id: input.courseId } };

    const job = await prisma.videoProductionJob.update({
      where: { id: jobId },
      data,
    });

    return success(job);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId } = await params;

    // Delete related records first
    await prisma.$transaction([
      prisma.videoJobStatusHistory.deleteMany({ where: { jobId } }),
      prisma.faceSwapConfig.deleteMany({ where: { jobId } }),
      prisma.videoProductionJob.delete({ where: { id: jobId } }),
    ]);

    return success({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
