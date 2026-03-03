/**
 * Scene Concatenator — merges individual scene videos into one final video.
 *
 * Uses FFmpeg concat demuxer to join scene videos in order.
 */

import { prisma } from "@/lib/db/prisma";
import { uploadBuffer } from "@/lib/storage/gcs";

/**
 * Concatenate all completed scene videos for a job into one final video.
 */
export async function concatenateScenes(jobId: string): Promise<{
  finalUrl: string;
  finalGcsPath: string;
  totalDurationSec: number;
}> {
  const scenes = await prisma.videoScene.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
  });

  if (scenes.length === 0) {
    throw new Error("No scenes found for job");
  }

  // Collect final video URLs for each scene
  const videoUrls: string[] = [];
  for (const scene of scenes) {
    const url = scene.finalVideoUrl || scene.uploadedVideoUrl || scene.renderedVideoUrl;
    if (!url) {
      throw new Error(`Scene ${scene.orderIndex} has no video URL`);
    }
    videoUrls.push(url);
  }

  // If only 1 scene, skip concatenation
  if (videoUrls.length === 1) {
    const gcsPath = `video-production/${jobId}/final-merged.mp4`;
    const response = await fetch(videoUrls[0]);
    if (!response.ok) throw new Error("Failed to download single scene video");
    const buffer = Buffer.from(await response.arrayBuffer());
    const publicUrl = await uploadBuffer("media", gcsPath, buffer, "video/mp4");
    return {
      finalUrl: publicUrl,
      finalGcsPath: gcsPath,
      totalDurationSec: scenes[0].finalDurationSec || scenes[0].durationSec,
    };
  }

  // Download all scene videos to temp files
  const os = await import("os");
  const path = await import("path");
  const fs = await import("fs/promises");
  const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
  const ffmpegModule = await import("fluent-ffmpeg");
  const ffmpeg = ffmpegModule.default || ffmpegModule;
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);

  const tmpDir = os.tmpdir();
  const tempFiles: string[] = [];
  const concatListPath = path.join(tmpDir, `${jobId}-concat-list.txt`);
  const outputPath = path.join(tmpDir, `${jobId}-final-merged.mp4`);

  try {
    // Download each scene video
    for (let i = 0; i < videoUrls.length; i++) {
      const tempPath = path.join(tmpDir, `${jobId}-scene-${i}.mp4`);
      const response = await fetch(videoUrls[i]);
      if (!response.ok) {
        throw new Error(`Failed to download scene ${i}: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(tempPath, buffer);
      tempFiles.push(tempPath);
    }

    // Create concat list file
    const concatContent = tempFiles
      .map((f) => `file '${f.replace(/\\/g, "/")}'`)
      .join("\n");
    await fs.writeFile(concatListPath, concatContent);

    // Run FFmpeg concat demuxer
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    // Upload merged result to GCS
    const mergedBuffer = await fs.readFile(outputPath);
    const gcsPath = `video-production/${jobId}/final-merged.mp4`;
    const publicUrl = await uploadBuffer(
      "media",
      gcsPath,
      Buffer.from(mergedBuffer),
      "video/mp4"
    );

    const totalDurationSec = scenes.reduce(
      (sum, s) => sum + (s.finalDurationSec || s.durationSec),
      0
    );

    return { finalUrl: publicUrl, finalGcsPath: gcsPath, totalDurationSec };
  } finally {
    // Cleanup temp files
    const cleanups = [...tempFiles, concatListPath, outputPath].map((f) =>
      fs.unlink(f).catch(() => {})
    );
    await Promise.all(cleanups);
  }
}
