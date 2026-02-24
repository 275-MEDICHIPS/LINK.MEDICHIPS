/**
 * POST /api/v1/admin/video-production/avatars/upload — Get signed upload URL for avatar image
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getSignedUploadUrl } from "@/lib/storage/gcs";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp)$/),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = uploadSchema.parse(body);

    const orgId = payload.orgId || "global";
    const gcsPath = `avatars/${orgId}/${Date.now()}-${input.fileName}`;

    const { uploadUrl, publicUrl } = await getSignedUploadUrl(
      "media",
      gcsPath,
      input.contentType
    );

    return success({ uploadUrl, publicUrl, gcsPath });
  } catch (error) {
    return handleError(error);
  }
}
