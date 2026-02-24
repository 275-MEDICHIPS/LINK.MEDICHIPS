/**
 * Post-processing pipeline for video production.
 *
 * When TTS voice is selected:
 *   1. Generate TTS audio from script segments
 *   2. Merge audio + video using ffmpeg
 *   3. Upload merged result to GCS
 *
 * When no TTS (Veo native audio):
 *   Pass through to Mux ingestion directly.
 */

import { prisma } from "@/lib/db/prisma";
import { synthesizeAndUpload, type SynthesizeParams } from "@/lib/tts/google-tts";
import { uploadBuffer } from "@/lib/storage/gcs";

/**
 * Run TTS audio generation for a job's script.
 */
export async function generateTtsForJob(jobId: string): Promise<{
  ttsAudioUrl: string;
  ttsAudioGcsPath: string;
}> {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
    include: { script: true },
  });

  if (!job) throw new Error("Job not found");
  if (!job.voicePresetId) throw new Error("No voice preset selected");
  if (!job.script) throw new Error("No script found for TTS generation");

  // Load the voice preset
  const preset = await prisma.voicePreset.findUnique({
    where: { id: job.voicePresetId },
  });
  if (!preset) throw new Error("Voice preset not found");

  // Extract full narration text from script segments
  const segments = job.script.segments as Array<{ text: string }> | null;
  const narrationText = segments
    ? segments.map((s) => s.text).join(" ")
    : job.script.rawScript;

  const params: SynthesizeParams = {
    text: narrationText,
    voiceName: preset.ttsVoiceName,
    languageCode: preset.languageCode,
    speakingRate: preset.speakingRate,
    pitch: preset.pitch,
  };

  const { gcsPath, publicUrl } = await synthesizeAndUpload(params, jobId);

  // Update job with TTS audio info
  await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: {
      ttsAudioUrl: publicUrl,
      ttsAudioGcsPath: gcsPath,
    },
  });

  return { ttsAudioUrl: publicUrl, ttsAudioGcsPath: gcsPath };
}

/**
 * Merge video (silent) + TTS audio using ffmpeg.
 *
 * Uses fluent-ffmpeg with @ffmpeg-installer/ffmpeg for cross-platform support.
 */
export async function mergeAudioVideo(
  jobId: string,
  videoUrl: string,
  audioUrl: string
): Promise<{ mergedVideoUrl: string; mergedVideoGcsPath: string }> {
  // Dynamic imports for ffmpeg
  const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
  const ffmpegModule = await import("fluent-ffmpeg");
  const ffmpeg = ffmpegModule.default || ffmpegModule;
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);

  // Download video and audio to temp buffers
  const [videoResponse, audioResponse] = await Promise.all([
    fetch(videoUrl),
    fetch(audioUrl),
  ]);

  if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.status}`);
  if (!audioResponse.ok) throw new Error(`Failed to download audio: ${audioResponse.status}`);

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

  // Write to temp files for ffmpeg processing
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs/promises");

  const tmpDir = os.tmpdir();
  const videoPath = path.join(tmpDir, `${jobId}-video.mp4`);
  const audioPath = path.join(tmpDir, `${jobId}-audio.mp3`);
  const outputPath = path.join(tmpDir, `${jobId}-merged.mp4`);

  await fs.writeFile(videoPath, videoBuffer);
  await fs.writeFile(audioPath, audioBuffer);

  // Merge using ffmpeg: copy video stream, encode audio as AAC
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });

  // Read merged output and upload to GCS
  const mergedBuffer = await fs.readFile(outputPath);
  const gcsPath = `veo-merged/${jobId}/final.mp4`;
  const publicUrl = await uploadBuffer(
    "media",
    gcsPath,
    Buffer.from(mergedBuffer),
    "video/mp4"
  );

  // Cleanup temp files
  await Promise.all([
    fs.unlink(videoPath).catch(() => {}),
    fs.unlink(audioPath).catch(() => {}),
    fs.unlink(outputPath).catch(() => {}),
  ]);

  // Update job
  await prisma.videoProductionJob.update({
    where: { id: jobId },
    data: {
      mergedVideoUrl: publicUrl,
      mergedVideoGcsPath: gcsPath,
    },
  });

  return { mergedVideoUrl: publicUrl, mergedVideoGcsPath: gcsPath };
}

/**
 * Full post-processing pipeline for a job.
 *
 * If TTS is selected: generate audio → merge → return merged URL.
 * Otherwise: return original video URL.
 */
export async function runPostProcessing(jobId: string): Promise<string> {
  const job = await prisma.videoProductionJob.findUnique({
    where: { id: jobId },
  });

  if (!job) throw new Error("Job not found");

  if (!job.voicePresetId) {
    // No TTS — use original output directly
    return job.outputVideoUrl!;
  }

  // Step 1: Generate TTS audio
  const { ttsAudioUrl } = await generateTtsForJob(jobId);

  // Step 2: Merge audio + video
  const { mergedVideoUrl } = await mergeAudioVideo(
    jobId,
    job.outputVideoUrl!,
    ttsAudioUrl
  );

  return mergedVideoUrl;
}
