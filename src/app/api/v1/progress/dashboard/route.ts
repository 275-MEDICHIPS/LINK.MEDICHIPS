import { NextRequest } from "next/server";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getDashboardProgress } from "@/lib/services/progress.service";

/**
 * GET /api/v1/progress/dashboard
 *
 * Return dashboard data including:
 *   - Enrolled courses with progress percentages
 *   - Pending tasks count
 *   - Total XP and recent XP history
 *   - Current streak
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const dashboard = await getDashboardProgress(payload.sub);
    return success(dashboard);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
