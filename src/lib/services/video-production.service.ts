/**
 * Video Production Service — orchestrates the full video production pipeline.
 *
 * Method 1 (AI Generated):
 *   DRAFT → SCRIPT_GENERATING → SCRIPT_REVIEW → QUEUED → RENDERING → REVIEW → COMPLETED
 *
 * Method 2 (Face Swap):
 *   DRAFT → QUEUED → FACE_SWAPPING → REVIEW → COMPLETED
 */

import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import { generateVideoScript } from "@/lib/ai/script-generator";
import {
  getVideoGenerationProvider,
  getFaceSwapProvider,
  isVideoGenerationProvider,
} from "@/lib/video/providers";
import { createAsset } from "@/lib/video/mux";
import { uploadBuffer } from "@/lib/storage/gcs";
import { createVersion } from "@/lib/services/content.service";
import { Prisma } from "@prisma/client";
import type {
  VideoProductionStatus,
  VideoProductionMethod,
  VideoProvider,
} from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface CreateJobParams {
  method: VideoProductionMethod;
  provider: VideoProvider;
  lessonId?: string;
  courseId?: string;
  config?: Record<string, unknown>;
  // Method 2 fields
  sourceVideoUrl?: string;
  sourceVideoGcsPath?: string;
  // Face swap config
  faceSwapConfig?: {
    targetFaceImageUrl?: string;
    faceMapping?: Record<string, string>;
    blurOriginalFaces?: boolean;
    preserveExpressions?: boolean;
    resolution?: string;
    fidelityLevel?: string;
  };
}

export interface GenerateScriptParams {
  topic: string;
  lessonContext?: string;
  targetLocale?: string;
  riskLevel?: "L1" | "L2" | "L3";
  targetDurationSec?: number;
  speakerName?: string;
  additionalInstructions?: string;
}

// ─── Status transition helper ────────────────────────────────────────

async function transitionStatus(
  jobId: string,
  fromStatuses: VideoProductionStatus[],
  toStatus: VideoProductionStatus,
  triggeredBy: string,
  extraData?: Record<string, unknown>,
  metadata?: Record<string, unknown>
) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (!fromStatuses.includes(job.status)) {
    throw new ApiError(
      `Cannot transition from ${job.status} to ${toStatus}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updated = await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: { status: toStatus, ...extraData },
  });

  await prisma.videoJobStatusHistory.create({
    data: {
      jobId,
      fromStatus: job.status,
      toStatus,
      triggeredBy,
      metadata: metadata
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  return updated;
}

// ─── Service methods ─────────────────────────────────────────────────

/**
 * Create a new video production job.
 */
export async function createJob(params: CreateJobParams, userId: string) {
  // Validate method-provider compatibility (VEO supports both methods)
  if (params.provider !== "VEO") {
    if (
      params.method === "AI_GENERATED" &&
      !isVideoGenerationProvider(params.provider)
    ) {
      throw new ApiError(
        "AI_GENERATED method requires VEO, SYNTHESIA, or HEYGEN provider",
        400,
        "INVALID_PROVIDER"
      );
    }
    if (
      params.method === "FACE_SWAP" &&
      isVideoGenerationProvider(params.provider)
    ) {
      throw new ApiError(
        "FACE_SWAP method requires VEO provider",
        400,
        "INVALID_PROVIDER"
      );
    }
  }

  const job = await prisma.videoProductionJob.create({
    data: {
      method: params.method,
      provider: params.provider,
      status: "DRAFT",
      lessonId: params.lessonId,
      courseId: params.courseId,
      config: params.config
        ? (params.config as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      sourceVideoUrl: params.sourceVideoUrl,
      sourceVideoGcsPath: params.sourceVideoGcsPath,
      ...(params.faceSwapConfig && {
        faceSwapConfig: {
          create: {
            targetFaceImageUrl: params.faceSwapConfig.targetFaceImageUrl,
            faceMapping: params.faceSwapConfig.faceMapping
              ? (params.faceSwapConfig.faceMapping as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            blurOriginalFaces: params.faceSwapConfig.blurOriginalFaces ?? true,
            preserveExpressions:
              params.faceSwapConfig.preserveExpressions ?? true,
            resolution: params.faceSwapConfig.resolution ?? "1080p",
            fidelityLevel: params.faceSwapConfig.fidelityLevel ?? "high",
          },
        },
      }),
    },
    include: { faceSwapConfig: true },
  });

  await prisma.videoJobStatusHistory.create({
    data: {
      jobId: job.id,
      fromStatus: "DRAFT",
      toStatus: "DRAFT",
      triggeredBy: userId,
      metadata: { action: "created" },
    },
  });

  return job;
}

/**
 * Generate a script using Claude AI.
 */
export async function generateScript(
  jobId: string,
  params: GenerateScriptParams,
  userId: string
) {
  const job = await transitionStatus(
    jobId,
    ["DRAFT"],
    "SCRIPT_GENERATING",
    userId
  );

  try {
    const result = await generateVideoScript(params);

    const script = await prisma.videoScript.create({
      data: {
        title: result.title,
        locale: params.targetLocale || "en",
        rawScript: result.segments.map((s) => s.text).join("\n\n"),
        segments: result.segments as unknown as object,
        totalDurationSec: result.totalDurationSec,
        isAiGenerated: true,
        aiPromptUsed: params.topic,
        aiConfidence: result.flaggedForReview ? 0.5 : 0.85,
        status: "DRAFT",
      },
    });

    await prisma.videoProductionJob.update({
      where: { id: jobId },
      data: {
        scriptId: script.id,
        status: "SCRIPT_REVIEW",
        estimatedCostUsd: getProvider(job).estimateCost(
          result.totalDurationSec
        ),
      },
    });

    await prisma.videoJobStatusHistory.create({
      data: {
        jobId,
        fromStatus: "SCRIPT_GENERATING",
        toStatus: "SCRIPT_REVIEW",
        triggeredBy: "system",
        metadata: {
          scriptId: script.id,
          totalDurationSec: result.totalDurationSec,
          flaggedForReview: result.flaggedForReview,
        },
      },
    });

    return { job: { ...job, status: "SCRIPT_REVIEW", scriptId: script.id }, script };
  } catch (error) {
    await prisma.videoProductionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Script generation failed",
      },
    });

    await prisma.videoJobStatusHistory.create({
      data: {
        jobId,
        fromStatus: "SCRIPT_GENERATING",
        toStatus: "FAILED",
        triggeredBy: "system",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });

    throw error;
  }
}

function getProvider(job: { method: string; provider: VideoProvider }) {
  if (job.method === "AI_GENERATED") {
    return getVideoGenerationProvider(job.provider);
  }
  return getFaceSwapProvider(job.provider);
}

/**
 * Approve script and queue for rendering.
 */
export async function approveScript(jobId: string, userId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
    include: { script: true },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");

  if (job.scriptId && job.script) {
    await prisma.videoScript.update({
      where: { id: job.scriptId },
      data: { status: "APPROVED", reviewedById: userId },
    });
  }

  return transitionStatus(jobId, ["SCRIPT_REVIEW"], "QUEUED", userId);
}

/**
 * Submit job to external provider.
 */
export async function submitToProvider(jobId: string, userId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
    include: { script: true, faceSwapConfig: true },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");

  // For face swap, can go from DRAFT directly to QUEUED if no script needed
  const allowedStatuses: VideoProductionStatus[] =
    job.method === "FACE_SWAP" ? ["DRAFT", "QUEUED"] : ["QUEUED"];

  if (!allowedStatuses.includes(job.status)) {
    throw new ApiError(
      `Cannot submit job in status ${job.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const targetStatus: VideoProductionStatus =
    job.method === "AI_GENERATED" ? "RENDERING" : "FACE_SWAPPING";

  try {
    let externalJobId: string;

    if (job.method === "AI_GENERATED") {
      if (!job.script) {
        throw new ApiError("Script required for AI_GENERATED method", 400, "SCRIPT_REQUIRED");
      }
      const provider = getVideoGenerationProvider(job.provider);
      const config = (job.config as Record<string, unknown>) || {};
      const result = await provider.createVideo({
        title: job.script.title,
        script: job.script.rawScript,
        segments: job.script.segments as unknown as import("@/lib/video/providers/types").ScriptSegment[],
        avatarId: config.avatarId as string | undefined,
        voiceId: config.voiceId as string | undefined,
        language: job.script.locale,
        aspectRatio: config.aspectRatio as "16:9" | "9:16" | "1:1" | undefined,
        background: config.background as string | undefined,
      });
      externalJobId = result.externalJobId;
    } else {
      if (!job.sourceVideoUrl) {
        throw new ApiError(
          "Source video URL required for FACE_SWAP method",
          400,
          "SOURCE_VIDEO_REQUIRED"
        );
      }
      const provider = getFaceSwapProvider(job.provider);
      const result = await provider.createFaceSwap({
        sourceVideoUrl: job.sourceVideoUrl,
        targetFaceImageUrl: job.faceSwapConfig?.targetFaceImageUrl ?? undefined,
        faceMapping: job.faceSwapConfig?.faceMapping as Record<string, string> | undefined,
        blurOriginalFaces: job.faceSwapConfig?.blurOriginalFaces,
        preserveExpressions: job.faceSwapConfig?.preserveExpressions,
        resolution: job.faceSwapConfig?.resolution,
        fidelityLevel: job.faceSwapConfig?.fidelityLevel,
      });
      externalJobId = result.externalJobId;
    }

    const updated = await prisma.videoProductionJob.update({
      where: { id: jobId },
      data: {
        status: targetStatus,
        externalJobId,
        submittedAt: new Date(),
        renderStartedAt: new Date(),
      },
    });

    await prisma.videoJobStatusHistory.create({
      data: {
        jobId,
        fromStatus: job.status,
        toStatus: targetStatus,
        triggeredBy: userId,
        metadata: { externalJobId },
      },
    });

    return updated;
  } catch (error) {
    await prisma.videoProductionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Provider submission failed",
      },
    });

    await prisma.videoJobStatusHistory.create({
      data: {
        jobId,
        fromStatus: job.status,
        toStatus: "FAILED",
        triggeredBy: "system",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });

    throw error;
  }
}

/**
 * Poll provider for job status.
 */
export async function pollProviderStatus(jobId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (!job.externalJobId) {
    throw new ApiError("No external job ID", 400, "NO_EXTERNAL_JOB");
  }

  const provider =
    job.method === "AI_GENERATED"
      ? getVideoGenerationProvider(job.provider)
      : getFaceSwapProvider(job.provider);

  const status = await provider.getJobStatus(job.externalJobId);

  await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: { externalStatus: status.status },
  });

  return { job, providerStatus: status };
}

/**
 * Download output from provider and store in GCS.
 */
export async function downloadAndStoreOutput(jobId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (!job.externalJobId) {
    throw new ApiError("No external job ID", 400, "NO_EXTERNAL_JOB");
  }

  const provider =
    job.method === "AI_GENERATED"
      ? getVideoGenerationProvider(job.provider)
      : getFaceSwapProvider(job.provider);

  const downloadUrl = await provider.getDownloadUrl(job.externalJobId);

  // Download the video
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to GCS
  const gcsPath = `video-production/${job.id}/${Date.now()}.mp4`;
  const publicUrl = await uploadBuffer("media", gcsPath, buffer, "video/mp4");

  await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: {
      outputVideoUrl: publicUrl,
      outputGcsPath: gcsPath,
      status: "POST_PROCESSING",
      renderCompletedAt: new Date(),
    },
  });

  await prisma.videoJobStatusHistory.create({
    data: {
      jobId,
      fromStatus: job.status,
      toStatus: "POST_PROCESSING",
      triggeredBy: "system",
      metadata: { gcsPath, downloadUrl },
    },
  });

  return { gcsPath, publicUrl };
}

/**
 * Ingest video from GCS to Mux.
 */
export async function ingestToMux(jobId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (!job.outputVideoUrl) {
    throw new ApiError("No output video URL", 400, "NO_OUTPUT_VIDEO");
  }

  const { assetId, playbackId } = await createAsset(job.outputVideoUrl);

  const updated = await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: {
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
      status: "REVIEW",
    },
  });

  await prisma.videoJobStatusHistory.create({
    data: {
      jobId,
      fromStatus: job.status,
      toStatus: "REVIEW",
      triggeredBy: "system",
      metadata: { muxAssetId: assetId, muxPlaybackId: playbackId },
    },
  });

  return updated;
}

/**
 * Approve the final video.
 */
export async function approveVideo(jobId: string, userId: string) {
  return transitionStatus(
    jobId,
    ["REVIEW"],
    "COMPLETED",
    userId,
    { completedAt: new Date() }
  );
}

/**
 * Reject the video.
 */
export async function rejectVideo(
  jobId: string,
  userId: string,
  reason: string
) {
  return transitionStatus(
    jobId,
    ["REVIEW"],
    "DRAFT",
    userId,
    { errorMessage: reason },
    { reason }
  );
}

/**
 * Publish completed video to a lesson as a ContentVersion.
 */
export async function publishToLesson(
  jobId: string,
  lessonId: string,
  userId: string
) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (job.status !== "COMPLETED") {
    throw new ApiError(
      "Job must be COMPLETED to publish",
      400,
      "INVALID_STATUS"
    );
  }

  const body = {
    type: "video",
    muxPlaybackId: job.muxPlaybackId,
    muxAssetId: job.muxAssetId,
    thumbnailUrl: job.thumbnailUrl,
    durationSec: job.durationSec,
    scriptId: job.scriptId,
    productionJobId: job.id,
    productionMethod: job.method,
  };

  const version = await createVersion(lessonId, body, true);

  // Link job to lesson if not already
  if (!job.lessonId) {
    await prisma.videoProductionJob.update({
      where: { id: jobId },
      data: { lessonId },
    });
  }

  await prisma.videoJobStatusHistory.create({
    data: {
      jobId,
      fromStatus: "COMPLETED",
      toStatus: "COMPLETED",
      triggeredBy: userId,
      metadata: {
        action: "published_to_lesson",
        lessonId,
        contentVersionId: version.id,
      },
    },
  });

  return { job, contentVersion: version };
}

/**
 * Retry a failed job.
 */
export async function retryJob(jobId: string, userId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });
  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (job.status !== "FAILED") {
    throw new ApiError("Only FAILED jobs can be retried", 400, "INVALID_STATUS");
  }
  if (job.retryCount >= job.maxRetries) {
    throw new ApiError(
      `Maximum retries (${job.maxRetries}) exceeded`,
      400,
      "MAX_RETRIES_EXCEEDED"
    );
  }

  const updated = await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: {
      status: "QUEUED",
      retryCount: { increment: 1 },
      errorMessage: null,
      externalJobId: null,
      externalStatus: null,
    },
  });

  await prisma.videoJobStatusHistory.create({
    data: {
      jobId,
      fromStatus: "FAILED",
      toStatus: "QUEUED",
      triggeredBy: userId,
      metadata: { retryCount: updated.retryCount },
    },
  });

  return updated;
}

/**
 * Cancel a job.
 */
export async function cancelJob(jobId: string, userId: string) {
  return transitionStatus(
    jobId,
    ["DRAFT", "SCRIPT_GENERATING", "SCRIPT_REVIEW", "QUEUED"],
    "CANCELLED",
    userId
  );
}

/**
 * Get job with all relations.
 */
export async function getJobDetail(jobId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
    include: {
      script: true,
      faceSwapConfig: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      lesson: {
        include: {
          translations: true,
          module: {
            include: {
              translations: true,
              course: { include: { translations: true } },
            },
          },
        },
      },
      course: { include: { translations: true } },
    },
  });

  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  return job;
}

/**
 * List jobs with filtering and pagination.
 */
export async function listJobs(filters: {
  page?: number;
  pageSize?: number;
  method?: VideoProductionMethod;
  status?: VideoProductionStatus;
  search?: string;
}) {
  const { page = 1, pageSize = 20, method, status, search } = filters;

  const where: Record<string, unknown> = {};
  if (method) where.method = method;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { script: { title: { contains: search, mode: "insensitive" } } },
      { externalJobId: { contains: search } },
    ];
  }

  const [jobs, total] = await prisma.$transaction([
    prisma.videoProductionJob.findMany({
      where,
      include: {
        script: { select: { id: true, title: true } },
        lesson: {
          include: {
            translations: { where: { locale: "en" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.videoProductionJob.count({ where }),
  ]);

  return { jobs, total, page, pageSize };
}

/**
 * Get dashboard stats.
 */
export async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, inProgress, awaitingReview, completedThisMonth, totalCost] =
    await prisma.$transaction([
      prisma.videoProductionJob.count(),
      prisma.videoProductionJob.count({
        where: {
          status: {
            in: [
              "SCRIPT_GENERATING",
              "QUEUED",
              "RENDERING",
              "FACE_SWAPPING",
              "POST_PROCESSING",
            ],
          },
        },
      }),
      prisma.videoProductionJob.count({
        where: { status: { in: ["SCRIPT_REVIEW", "REVIEW"] } },
      }),
      prisma.videoProductionJob.count({
        where: {
          status: "COMPLETED",
          completedAt: { gte: startOfMonth },
        },
      }),
      prisma.videoProductionJob.aggregate({
        _sum: { actualCostUsd: true },
      }),
    ]);

  return {
    total,
    inProgress,
    awaitingReview,
    completedThisMonth,
    totalCostUsd: totalCost._sum.actualCostUsd ?? 0,
  };
}
