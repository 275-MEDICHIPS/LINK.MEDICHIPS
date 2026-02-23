import { getSignedUploadUrl, getSignedReadUrl, deleteFile, uploadBuffer } from "@/lib/storage/gcs";
import { createAsset, createDirectUpload, getAssetStatus, deleteAsset, getPlaybackUrl, getThumbnailUrl } from "@/lib/video/mux";
import { logger } from "@/lib/utils/logger";

export class MediaService {
  /**
   * Get upload URL based on file type.
   */
  async getUploadUrl(params: {
    type: "image" | "document" | "video" | "evidence";
    fileName: string;
    contentType: string;
    orgId: string;
  }): Promise<{
    uploadUrl: string;
    publicUrl?: string;
    uploadId?: string;
    provider: "gcs" | "mux";
  }> {
    if (params.type === "video") {
      const { uploadId, uploadUrl } = await createDirectUpload();
      return { uploadUrl, uploadId, provider: "mux" };
    }

    const bucket = params.type === "evidence" ? "uploads" : "media";
    const path = `${params.orgId}/${params.type}/${Date.now()}-${params.fileName}`;
    const { uploadUrl, publicUrl } = await getSignedUploadUrl(
      bucket,
      path,
      params.contentType
    );

    return { uploadUrl, publicUrl, provider: "gcs" };
  }

  /**
   * Get a signed read URL for a file.
   */
  async getReadUrl(bucket: "media" | "uploads" | "certs", fileName: string): Promise<string> {
    return getSignedReadUrl(bucket, fileName);
  }

  /**
   * Check video processing status.
   */
  async getVideoStatus(assetId: string) {
    const status = await getAssetStatus(assetId);
    return {
      ...status,
      playbackUrl: status.playbackId ? getPlaybackUrl(status.playbackId) : null,
      thumbnailUrl: status.playbackId ? getThumbnailUrl(status.playbackId, { width: 640 }) : null,
    };
  }

  /**
   * Create a Mux asset from a URL (for server-side uploads).
   */
  async createVideoAsset(url: string) {
    return createAsset(url);
  }

  /**
   * Delete a media file.
   */
  async deleteMedia(params: {
    type: "image" | "document" | "video" | "evidence";
    fileUrl: string;
    muxAssetId?: string;
  }): Promise<void> {
    try {
      if (params.type === "video" && params.muxAssetId) {
        await deleteAsset(params.muxAssetId);
      } else {
        // Extract bucket and path from URL
        const url = new URL(params.fileUrl);
        const pathParts = url.pathname.split("/");
        const bucketName = pathParts[1];
        const fileName = pathParts.slice(2).join("/");

        const bucketMap: Record<string, "media" | "uploads" | "certs"> = {
          "medichips-link-media": "media",
          "medichips-link-uploads": "uploads",
          "medichips-link-certs": "certs",
        };

        const bucket = bucketMap[bucketName];
        if (bucket) {
          await deleteFile(bucket, fileName);
        }
      }
    } catch (error) {
      logger.error("Failed to delete media", error, { fileUrl: params.fileUrl });
      throw error;
    }
  }

  /**
   * Upload a generated file (e.g., certificate PDF).
   */
  async uploadGenerated(
    bucket: "media" | "uploads" | "certs",
    fileName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    return uploadBuffer(bucket, fileName, buffer, contentType);
  }
}
