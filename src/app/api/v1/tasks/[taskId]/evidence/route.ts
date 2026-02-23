import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";
import { submitTaskEvidence, getTask } from "@/lib/services/task.service";

const evidenceSchema = z.object({
  fileUrl: z.string().url(),
  fileType: z.string().min(1).max(50),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/v1/tasks/[taskId]/evidence
 *
 * Upload evidence for a task.
 * Only the task assignee can submit evidence.
 * Task must be in PENDING, IN_PROGRESS, or REJECTED status.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { taskId } = await params;

    // Verify the user owns this task
    const task = await getTask(taskId);
    if (task.assigneeId !== payload.sub) {
      throw new ApiError("Only the assignee can submit evidence", 403);
    }

    const body = await req.json();
    const evidence = evidenceSchema.parse(body);

    const created = await submitTaskEvidence(taskId, evidence);
    return success(created, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
