import { NextRequest } from "next/server";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { analyticsService } from "@/lib/services/analytics.service";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "operational";
    const orgId = url.searchParams.get("orgId") || payload.orgId;
    const programId = url.searchParams.get("programId") || undefined;

    if (type === "impact") {
      const data = await analyticsService.getImpactDashboard(orgId);
      return success(data);
    }

    const data = await analyticsService.getOperationalDashboard(orgId);
    return success(data);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
