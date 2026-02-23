import { NextRequest } from "next/server";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getAssetStatus, getPlaybackUrl, getThumbnailUrl } from "@/lib/video/mux";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    authenticate(req);
    const { assetId } = await params;

    const status = await getAssetStatus(assetId);

    return success({
      ...status,
      playbackUrl: status.playbackId ? getPlaybackUrl(status.playbackId) : null,
      thumbnailUrl: status.playbackId ? getThumbnailUrl(status.playbackId, { width: 640 }) : null,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
