/**
 * POST /api/v1/admin/video-production/jobs/[jobId]/scenes/[sceneId]/upload
 *
 * Generate a GCS signed URL for doctor video upload, or record an uploaded video.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { setSceneUploadedVideo } from "@/lib/services/scene-renderer.service";
import { getSignedUploadUrl } from "@/lib/storage/gcs";

const uploadSchema = z.object({
  // Option 1: Request signed URL for direct upload
  requestSignedUrl: z.boolean().optional(),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  // Option 2: Record already-uploaded video
  uploadedVideoUrl: z.string().url().optional(),
  uploadedVideoGcsPath: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; sceneId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { jobId, sceneId } = await params;
    const body = await req.json();
    const input = uploadSchema.parse(body);

    if (input.requestSignedUrl) {
      // Generate signed URL for GCS direct upload
      const ext = input.fileName?.split(".").pop() || "mp4";
      const gcsPath = `video-scenes/${jobId}/${sceneId}/doctor-upload.${ext}`;
      const signedUrl = await getSignedUploadUrl(
        "media",
        gcsPath,
        input.contentType || "video/mp4"
      );
      return success({ signedUrl, gcsPath });
    }

    if (input.uploadedVideoUrl && input.uploadedVideoGcsPath) {
      const scene = await setSceneUploadedVideo(
        sceneId,
        input.uploadedVideoUrl,
        input.uploadedVideoGcsPath
      );
      return success(scene);
    }

    return success({ error: "Provide requestSignedUrl or uploadedVideoUrl" }, 400);
  } catch (error) {
    return handleError(error);
  }
}
