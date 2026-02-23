import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  handleAuthError,
  AuthError,
} from "@/lib/auth/guards";
import {
  success,
  paginated,
  handleError,
} from "@/lib/utils/api-response";
import {
  listPendingReviews,
  approveVersion,
  rejectVersion,
} from "@/lib/services/content.service";

// ─── Schemas ─────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .default("IN_REVIEW"),
  riskLevel: z.enum(["L1", "L2", "L3"]).optional(),
  isAiGenerated: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

const reviewActionSchema = z.object({
  versionId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().min(1).max(2000).optional(),
});

// ─── GET /api/v1/admin/content-review ────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(
      payload,
      "SUPER_ADMIN",
      "ORG_ADMIN",
      "INSTRUCTOR",
      "SUPERVISOR"
    );

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const query = listQuerySchema.parse(params);

    const { versions, total, page, pageSize } =
      await listPendingReviews({
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        riskLevel: query.riskLevel,
        isAiGenerated: query.isAiGenerated,
      });

    return paginated(versions, total, page, pageSize);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── POST /api/v1/admin/content-review ───────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(
      payload,
      "SUPER_ADMIN",
      "ORG_ADMIN",
      "INSTRUCTOR",
      "SUPERVISOR"
    );

    const body = await req.json();
    const data = reviewActionSchema.parse(body);

    if (data.action === "approve") {
      const version = await approveVersion(
        data.versionId,
        payload.sub
      );
      return success(version);
    }

    if (data.action === "reject") {
      if (!data.reason) {
        return handleError(
          new (await import("@/lib/utils/api-response")).ApiError(
            "Reason is required for rejection",
            400,
            "REASON_REQUIRED"
          )
        );
      }

      const version = await rejectVersion(
        data.versionId,
        payload.sub,
        data.reason
      );
      return success(version);
    }

    // Unreachable due to zod enum, but TypeScript safety
    return handleError(
      new (await import("@/lib/utils/api-response")).ApiError(
        "Invalid action",
        400
      )
    );
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
