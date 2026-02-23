import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getSignedUploadUrl } from "@/lib/storage/gcs";
import { createDirectUpload } from "@/lib/video/mux";

const uploadSchema = z.object({
  type: z.enum(["image", "document", "video", "evidence"]),
  fileName: z.string(),
  contentType: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const { type, fileName, contentType } = uploadSchema.parse(body);

    if (type === "video") {
      // Use Mux direct upload for video
      requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");
      const { uploadId, uploadUrl } = await createDirectUpload();
      return success({ uploadId, uploadUrl, provider: "mux" });
    }

    // Use GCS signed URL for other file types
    const bucket = type === "evidence" ? "uploads" : "media";
    const path = `${payload.orgId}/${type}/${Date.now()}-${fileName}`;
    const { uploadUrl, publicUrl } = await getSignedUploadUrl(
      bucket,
      path,
      contentType
    );

    return success({ uploadUrl, publicUrl, provider: "gcs" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
