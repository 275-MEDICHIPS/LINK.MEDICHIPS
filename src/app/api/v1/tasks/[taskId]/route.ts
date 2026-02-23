import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";
import { getTask, updateTaskStatus } from "@/lib/services/task.service";
import type { TaskStatus } from "@prisma/client";

const updateTaskSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "SUBMITTED", "VERIFIED", "REJECTED"]),
});

/**
 * GET /api/v1/tasks/[taskId]
 *
 * Get task details with evidence, assignee, and lesson info.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { taskId } = await params;

    const task = await getTask(taskId);

    // Only the assignee, creator, or supervisors+ can view
    if (
      task.assigneeId !== payload.sub &&
      task.creatorId !== payload.sub &&
      !["SUPERVISOR", "MENTOR", "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN"].includes(
        payload.role
      )
    ) {
      throw new ApiError("Access denied", 403);
    }

    return success(task);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * PATCH /api/v1/tasks/[taskId]
 *
 * Update task status. Enforces valid state transitions:
 *   PENDING -> IN_PROGRESS
 *   IN_PROGRESS -> SUBMITTED | PENDING
 *   SUBMITTED -> VERIFIED | REJECTED (supervisor only via /verify)
 *   REJECTED -> IN_PROGRESS | SUBMITTED
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { taskId } = await params;

    const body = await req.json();
    const { status } = updateTaskSchema.parse(body);

    // For VERIFIED/REJECTED, enforce supervisor route
    if (status === "VERIFIED" || status === "REJECTED") {
      throw new ApiError(
        "Use POST /api/v1/tasks/[taskId]/verify to verify or reject tasks",
        400
      );
    }

    // Verify the user owns this task
    const task = await getTask(taskId);
    if (task.assigneeId !== payload.sub) {
      throw new ApiError("Only the assignee can update task status", 403);
    }

    const updated = await updateTaskStatus(taskId, status as TaskStatus);
    return success(updated);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
