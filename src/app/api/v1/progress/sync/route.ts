import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";
import { syncOfflineProgress } from "@/lib/services/progress.service";

const progressItemSchema = z.object({
  type: z.enum(["LessonProgress", "QuizAttempt", "TaskProgress", "Evidence", "XP"]),
  entityId: z.string().min(1),
  data: z.record(z.unknown()),
  checksum: z.string().optional(),
  idempotencyKey: z.string().optional(),
  clientTimestamp: z.string().datetime(),
});

const syncRequestSchema = z.object({
  items: z.array(progressItemSchema).min(1).max(100),
});

/**
 * POST /api/v1/progress/sync
 *
 * Batch sync offline progress items.
 * Validates checksums and applies domain-specific merge strategies:
 *   LessonProgress: MAX(server, client)
 *   QuizAttempt: APPEND-ONLY, MAX(score) for pass
 *   TaskProgress: server priority
 *   Evidence: APPEND
 *   XP: APPEND with idempotency key dedup
 */
export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const { items } = syncRequestSchema.parse(body);

    const results = await syncOfflineProgress(payload.sub, items);

    const accepted = results.filter((r) => r.status === "accepted" || r.status === "merged").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    return success({
      syncedAt: new Date().toISOString(),
      totalItems: items.length,
      accepted,
      rejected,
      results,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
