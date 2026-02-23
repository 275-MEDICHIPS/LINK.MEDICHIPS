import { NextRequest } from "next/server";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";
import { getLeaderboard } from "@/lib/services/gamification.service";

/**
 * GET /api/v1/gamification/leaderboard
 * Return leaderboard (org-scoped, cached every 15 min)
 * Query params: limit (default 50, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    if (!payload.orgId) {
      throw new ApiError("Organization context required", 400, "ORG_REQUIRED");
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
      100
    );

    const leaderboard = await getLeaderboard(payload.orgId, limit);

    return success({
      orgId: payload.orgId,
      entries: leaderboard,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
