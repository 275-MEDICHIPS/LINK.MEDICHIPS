/**
 * GET /api/v1/admin/video-production/stats — Dashboard statistics
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getStats } from "@/lib/services/video-production.service";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const stats = await getStats();
    return success(stats);
  } catch (error) {
    return handleError(error);
  }
}
