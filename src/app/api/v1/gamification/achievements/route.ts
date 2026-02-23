import { NextRequest } from "next/server";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getAllBadgesWithStatus } from "@/lib/services/gamification.service";

/**
 * GET /api/v1/gamification/achievements
 * Return all badges (earned + available) for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const badges = await getAllBadgesWithStatus(payload.sub);

    const earned = badges.filter((b) => b.earned);
    const available = badges.filter((b) => !b.earned);

    return success({
      total: badges.length,
      earned: earned.length,
      available: available.length,
      badges,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
