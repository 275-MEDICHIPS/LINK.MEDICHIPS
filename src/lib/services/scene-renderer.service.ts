/**
 * Scene Renderer Service — manages VideoScene lifecycle for AI video production.
 *
 * Responsibilities:
 * - Hydrate scenes from VideoScript segments
 * - Scene source selection (DOCTOR_VIDEO / AI_GENERATED)
 * - Per-scene rendering (TTS + Veo/Seedance)
 * - Scene concatenation into final video
 */

import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import { getVideoGenerationProvider } from "@/lib/video/providers";
import { uploadBuffer } from "@/lib/storage/gcs";
import type {
  SceneSource,
  SceneRenderStatus,
  VideoProvider,
} from "@prisma/client";
import type { ScriptSegment } from "@/lib/video/providers/types";
import { Prisma } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface UpdateSceneParams {
  source?: SceneSource;
  text?: string;
  visualNotes?: string;
  durationSec?: number;
  speakerLabel?: string;
}

// ─── Hydration ───────────────────────────────────────────────────────

/**
 * Create VideoScene rows from a job's VideoScript segments.
 * Called when script is approved and transitions to SCENE_SETUP.
 */
export async function hydrateScenes(jobId: string) {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
    include: { script: true, scenes: true },
  });

  if (!job) throw new ApiError("Job not found", 404, "JOB_NOT_FOUND");
  if (!job.script) throw new ApiError("No script found", 400, "NO_SCRIPT");

  // If scenes already exist, delete and re-create
  if (job.scenes.length > 0) {
    await prisma.videoScene.deleteMany({ where: { jobId } });
  }

  const segments = job.script.segments as ScriptSegment[] | null;
  if (!segments || segments.length === 0) {
    throw new ApiError("Script has no segments", 400, "NO_SEGMENTS");
  }

  const scenes = await prisma.$transaction(
    segments.map((seg, index) =>
      prisma.videoScene.create({
        data: {
          jobId,
          orderIndex: index,
          speakerLabel: seg.speakerLabel || null,
          text: seg.text,
          visualNotes: seg.visualNotes || null,
          durationSec: seg.durationSec || 8,
          source: "AI_GENERATED",
          renderStatus: "PENDING",
          estimatedCostUsd: estimateSceneCost(
            seg.durationSec || 8,
            job.provider
          ),
        },
      })
    )
  );

  return scenes;
}

// ─── Scene CRUD ──────────────────────────────────────────────────────

/**
 * Get all scenes for a job, ordered by orderIndex.
 */
export async function getScenesByJob(jobId: string) {
  const scenes = await prisma.videoScene.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
  });
  return scenes;
}

/**
 * Get a single scene by ID.
 */
export async function getScene(sceneId: string) {
  const scene = await prisma.videoScene.findUnique({
    where: { id: sceneId },
  });
  if (!scene) throw new ApiError("Scene not found", 404, "SCENE_NOT_FOUND");
  return scene;
}

/**
 * Update a scene's source or content.
 */
export async function updateScene(
  sceneId: string,
  params: UpdateSceneParams
) {
  const scene = await prisma.videoScene.findUnique({
    where: { id: sceneId },
  });
  if (!scene) throw new ApiError("Scene not found", 404, "SCENE_NOT_FOUND");

  const data: Record<string, unknown> = {};

  if (params.source !== undefined) {
    data.source = params.source;
    // Reset render status when source changes
    data.renderStatus = "PENDING";
    // If switching to DOCTOR_VIDEO, clear AI render fields
    if (params.source === "DOCTOR_VIDEO") {
      data.externalJobId = null;
      data.renderedVideoUrl = null;
      data.renderedVideoGcsPath = null;
      data.estimatedCostUsd = 0;
    } else {
      // Re-estimate cost for AI sources
      const job = await prisma.videoProductionJob.findUnique({
        where: { id: scene.jobId },
      });
      if (job) {
        data.estimatedCostUsd = estimateSceneCost(
          params.durationSec ?? scene.durationSec,
          job.provider
        );
      }
    }
  }

  if (params.text !== undefined) data.text = params.text;
  if (params.visualNotes !== undefined) data.visualNotes = params.visualNotes;
  if (params.durationSec !== undefined) data.durationSec = params.durationSec;
  if (params.speakerLabel !== undefined) data.speakerLabel = params.speakerLabel;

  return prisma.videoScene.update({
    where: { id: sceneId },
    data,
  });
}

/**
 * Update scene order (reorder).
 */
export async function reorderScenes(
  jobId: string,
  sceneOrder: string[]
) {
  await prisma.$transaction(
    sceneOrder.map((sceneId, index) =>
      prisma.videoScene.update({
        where: { id: sceneId },
        data: { orderIndex: index },
      })
    )
  );
  return getScenesByJob(jobId);
}

// ─── Scene Upload ────────────────────────────────────────────────────

/**
 * Record a doctor-uploaded video for a scene.
 */
export async function setSceneUploadedVideo(
  sceneId: string,
  uploadedVideoUrl: string,
  uploadedVideoGcsPath: string
) {
  return prisma.videoScene.update({
    where: { id: sceneId },
    data: {
      uploadedVideoUrl,
      uploadedVideoGcsPath,
      renderStatus: "COMPLETED",
      finalVideoUrl: uploadedVideoUrl,
      finalVideoGcsPath: uploadedVideoGcsPath,
      actualCostUsd: 0,
    },
  });
}

// ─── Scene Rendering ─────────────────────────────────────────────────

/**
 * Render a single AI scene via the video provider.
 */
export async function renderScene(sceneId: string) {
  const scene = await prisma.videoScene.findUnique({
    where: { id: sceneId },
    include: { job: true },
  });
  if (!scene) throw new ApiError("Scene not found", 404, "SCENE_NOT_FOUND");

  if (scene.source === "DOCTOR_VIDEO") {
    // Doctor video — mark as skipped (already has upload)
    if (!scene.uploadedVideoUrl) {
      throw new ApiError(
        "Doctor video not uploaded yet",
        400,
        "NO_UPLOAD"
      );
    }
    return prisma.videoScene.update({
      where: { id: sceneId },
      data: { renderStatus: "SKIPPED" },
    });
  }

  // Mark as rendering
  await prisma.videoScene.update({
    where: { id: sceneId },
    data: {
      renderStatus: "RENDERING",
      errorMessage: null,
    },
  });

  try {
    const provider = getVideoGenerationProvider(scene.job.provider);

    // Build prompt from scene text + visual notes
    const segment: ScriptSegment = {
      speakerLabel: scene.speakerLabel || "Narrator",
      text: scene.text,
      durationSec: scene.durationSec,
      visualNotes: scene.visualNotes || undefined,
    };

    // Resolve avatar if set
    let avatarImageUrl: string | undefined;
    if (scene.job.avatarId) {
      const avatar = await prisma.avatar.findUnique({
        where: { id: scene.job.avatarId },
      });
      if (avatar) avatarImageUrl = avatar.imageUrl;
    }

    const config = (scene.job.config as Record<string, unknown>) || {};

    const result = await provider.createVideo({
      title: `Scene ${scene.orderIndex + 1}`,
      script: scene.text,
      segments: [segment],
      avatarId: scene.job.avatarId ?? undefined,
      avatarImageUrl,
      voicePresetId: scene.job.voicePresetId ?? undefined,
      language: config.language as string | undefined,
      aspectRatio: config.aspectRatio as "16:9" | "9:16" | "1:1" | undefined,
    });

    return prisma.videoScene.update({
      where: { id: sceneId },
      data: {
        externalJobId: result.externalJobId,
        renderStatus: "RENDERING",
      },
    });
  } catch (error) {
    await prisma.videoScene.update({
      where: { id: sceneId },
      data: {
        renderStatus: "FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Render failed",
        retryCount: { increment: 1 },
      },
    });
    throw error;
  }
}

/**
 * Render all AI-sourced scenes in parallel.
 */
export async function renderAllScenes(jobId: string) {
  const scenes = await prisma.videoScene.findMany({
    where: {
      jobId,
      source: { in: ["AI_GENERATED", "STOCK_FOOTAGE", "HYBRID"] },
      renderStatus: { in: ["PENDING", "FAILED"] },
    },
    orderBy: { orderIndex: "asc" },
  });

  const results = await Promise.allSettled(
    scenes.map((scene) => renderScene(scene.id))
  );

  const summary = {
    total: scenes.length,
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };

  return summary;
}

/**
 * Poll render status for a scene.
 */
export async function pollSceneRenderStatus(sceneId: string) {
  const scene = await prisma.videoScene.findUnique({
    where: { id: sceneId },
    include: { job: true },
  });
  if (!scene) throw new ApiError("Scene not found", 404, "SCENE_NOT_FOUND");
  if (!scene.externalJobId) return scene;

  const provider = getVideoGenerationProvider(scene.job.provider);
  const status = await provider.getJobStatus(scene.externalJobId);

  if (status.status === "completed" && status.downloadUrl) {
    // Download and store in GCS
    const response = await fetch(status.downloadUrl);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const gcsPath = `video-scenes/${scene.jobId}/${scene.id}/v${scene.version}.mp4`;
    const publicUrl = await uploadBuffer("media", gcsPath, buffer, "video/mp4");

    return prisma.videoScene.update({
      where: { id: sceneId },
      data: {
        renderStatus: "COMPLETED",
        renderedVideoUrl: publicUrl,
        renderedVideoGcsPath: gcsPath,
        finalVideoUrl: publicUrl,
        finalVideoGcsPath: gcsPath,
        actualCostUsd: estimateSceneCost(scene.durationSec, scene.job.provider),
      },
    });
  }

  if (status.status === "failed") {
    return prisma.videoScene.update({
      where: { id: sceneId },
      data: {
        renderStatus: "FAILED",
        errorMessage: status.errorMessage || "Provider render failed",
      },
    });
  }

  return scene;
}

/**
 * Re-render a single scene (for FINAL_REVIEW stage partial re-render).
 */
export async function reRenderScene(sceneId: string) {
  const scene = await prisma.videoScene.findUnique({
    where: { id: sceneId },
  });
  if (!scene) throw new ApiError("Scene not found", 404, "SCENE_NOT_FOUND");

  // Increment version, reset render state
  await prisma.videoScene.update({
    where: { id: sceneId },
    data: {
      version: { increment: 1 },
      renderStatus: "PENDING",
      externalJobId: null,
      renderedVideoUrl: null,
      renderedVideoGcsPath: null,
      finalVideoUrl: null,
      finalVideoGcsPath: null,
      errorMessage: null,
      actualCostUsd: null,
    },
  });

  return renderScene(sceneId);
}

// ─── Scene TTS Post-Processing ───────────────────────────────────────

/**
 * Run TTS + merge for a single scene.
 */
export async function runScenePostProcessing(sceneId: string) {
  const scene = await prisma.videoScene.findUnique({
    where: { id: sceneId },
    include: { job: true },
  });
  if (!scene) throw new ApiError("Scene not found", 404, "SCENE_NOT_FOUND");

  // Only post-process if job has a voice preset and scene has rendered video
  if (!scene.job.voicePresetId) return scene;

  const videoUrl =
    scene.source === "DOCTOR_VIDEO"
      ? scene.uploadedVideoUrl
      : scene.renderedVideoUrl;

  if (!videoUrl) return scene;

  await prisma.videoScene.update({
    where: { id: sceneId },
    data: { renderStatus: "POST_PROCESSING" },
  });

  try {
    const { synthesizeAndUpload } = await import("@/lib/tts/google-tts");

    const preset = await prisma.voicePreset.findUnique({
      where: { id: scene.job.voicePresetId! },
    });
    if (!preset) throw new Error("Voice preset not found");

    // Generate TTS for this scene's text
    const { gcsPath: ttsGcsPath, publicUrl: ttsUrl } =
      await synthesizeAndUpload(
        {
          text: scene.text,
          voiceName: preset.ttsVoiceName,
          languageCode: preset.languageCode,
          speakingRate: preset.speakingRate,
          pitch: preset.pitch,
        },
        `${scene.jobId}-scene-${scene.id}`
      );

    // Merge TTS audio with scene video
    const { mergeAudioVideo } = await import("@/lib/video/post-processing");
    const mergeResult = await mergeAudioVideo(
      `${scene.jobId}-scene-${scene.id}`,
      videoUrl,
      ttsUrl
    );

    return prisma.videoScene.update({
      where: { id: sceneId },
      data: {
        ttsAudioUrl: ttsUrl,
        ttsAudioGcsPath: ttsGcsPath,
        finalVideoUrl: mergeResult.mergedVideoUrl,
        finalVideoGcsPath: mergeResult.mergedVideoGcsPath,
        renderStatus: "COMPLETED",
      },
    });
  } catch (error) {
    console.error(`[scene-post-processing] Failed for scene ${sceneId}:`, error);
    // Non-fatal: keep the original video
    return prisma.videoScene.update({
      where: { id: sceneId },
      data: { renderStatus: "COMPLETED" },
    });
  }
}

// ─── Cost Estimation ─────────────────────────────────────────────────

function estimateSceneCost(
  durationSec: number,
  provider: VideoProvider
): number {
  const COST_PER_SECOND: Record<string, number> = {
    VEO: 0.35,
    SEEDANCE: 0.25, // estimated
  };
  return Math.ceil(durationSec) * (COST_PER_SECOND[provider] ?? 0.35);
}

/**
 * Calculate total cost summary for all scenes in a job.
 */
export async function getJobCostSummary(jobId: string) {
  const scenes = await prisma.videoScene.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
  });

  const aiScenes = scenes.filter((s) => s.source !== "DOCTOR_VIDEO");
  const doctorScenes = scenes.filter((s) => s.source === "DOCTOR_VIDEO");

  const totalEstimated = scenes.reduce(
    (sum, s) => sum + (s.estimatedCostUsd ?? 0),
    0
  );
  const totalActual = scenes.reduce(
    (sum, s) => sum + (s.actualCostUsd ?? 0),
    0
  );
  const savedByDoctor = doctorScenes.reduce(
    (sum, s) => sum + estimateSceneCost(s.durationSec, "VEO" as VideoProvider),
    0
  );

  return {
    totalScenes: scenes.length,
    aiScenes: aiScenes.length,
    doctorScenes: doctorScenes.length,
    totalEstimatedCostUsd: totalEstimated,
    totalActualCostUsd: totalActual,
    savedByDoctorVideoUsd: savedByDoctor,
  };
}
