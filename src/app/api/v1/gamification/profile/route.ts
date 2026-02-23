import { NextRequest } from "next/server";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getGamificationProfile } from "@/lib/services/gamification.service";

/**
 * GET /api/v1/gamification/profile
 * Return gamification profile (XP, level, badges, streak, rank)
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const profile = await getGamificationProfile(payload.sub, payload.orgId);

    return success(profile);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
