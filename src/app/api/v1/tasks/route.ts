import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  handleAuthError,
} from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";
import { getMyTasks, createTask } from "@/lib/services/task.service";
import type { TaskStatus } from "@prisma/client";

const createTaskSchema = z.object({
  lessonId: z.string().optional(),
  assigneeId: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  checklist: z
    .array(
      z.object({
        label: z.string().min(1),
        done: z.boolean().default(false),
      })
    )
    .optional(),
  dueDate: z.string().datetime().optional(),
});

const VALID_STATUSES: TaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
];

/**
 * GET /api/v1/tasks
 *
 * List tasks assigned to the current user.
 * Query params:
 *   - status: filter by task status
 *   - page: page number (default 1)
 *   - pageSize: items per page (default 20)
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as TaskStatus)
        ? (statusParam as TaskStatus)
        : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
    );

    const result = await getMyTasks(payload.sub, status, page, pageSize);
    return paginated(result.tasks, result.total, result.page, result.pageSize);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * POST /api/v1/tasks
 *
 * Create a new task (supervisor only).
 * Supervisors can assign tasks to learners in their organization.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(
      payload,
      "SUPERVISOR",
      "INSTRUCTOR",
      "ORG_ADMIN",
      "SUPER_ADMIN"
    );

    const body = await req.json();
    const input = createTaskSchema.parse(body);

    const task = await createTask({
      lessonId: input.lessonId,
      assigneeId: input.assigneeId,
      creatorId: payload.sub,
      title: input.title,
      description: input.description,
      checklist: input.checklist,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });

    return success(task, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
