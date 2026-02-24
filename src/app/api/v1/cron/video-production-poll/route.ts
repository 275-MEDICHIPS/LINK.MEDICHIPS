/**
 * POST /api/v1/cron/video-production-poll
 *
 * Fallback cron job to poll provider status for active jobs.
 * Protected by CRON_SECRET header — not JWT auth.
 *
 * Schedule: every 2 minutes via Cloud Scheduler or Vercel Cron.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  pollProviderStatus,
  downloadAndStoreOutput,
  ingestToMux,
} from "@/lib/services/video-production.service";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.VIDEO_PRODUCTION_CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");

  if (!cronSecret || headerSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all active rendering/face-swapping jobs
  const activeJobs = await prisma.videoProductionJob.findMany({
    where: {
      status: { in: ["RENDERING", "FACE_SWAPPING"] },
      externalJobId: { not: null },
    },
    take: 50,
    orderBy: { submittedAt: "asc" },
  });

  const results: {
    jobId: string;
    action: string;
    success: boolean;
    error?: string;
  }[] = [];

  for (const job of activeJobs) {
    try {
      const { providerStatus } = await pollProviderStatus(job.id);

      if (providerStatus.status === "completed") {
        await downloadAndStoreOutput(job.id);
        await ingestToMux(job.id);
        results.push({ jobId: job.id, action: "completed", success: true });
      } else if (providerStatus.status === "failed") {
        await prisma.videoProductionJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage: providerStatus.errorMessage || "Provider reported failure",
          },
        });

        await prisma.videoJobStatusHistory.create({
          data: {
            jobId: job.id,
            fromStatus: job.status,
            toStatus: "FAILED",
            triggeredBy: "cron",
            metadata: { providerStatus: JSON.parse(JSON.stringify(providerStatus)) },
          },
        });

        results.push({ jobId: job.id, action: "failed", success: true });
      } else {
        results.push({ jobId: job.id, action: "still_processing", success: true });
      }
    } catch (error) {
      results.push({
        jobId: job.id,
        action: "error",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    polled: activeJobs.length,
    results,
  });
}
