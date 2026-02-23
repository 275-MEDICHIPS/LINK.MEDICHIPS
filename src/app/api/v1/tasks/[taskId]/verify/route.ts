import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  handleAuthError,
} from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { verifyTask } from "@/lib/services/task.service";

const verifySchema = z.object({
  result: z.enum(["VERIFIED", "REJECTED"]),
  digitalSignature: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/v1/tasks/[taskId]/verify
 *
 * Verify or reject a submitted task (supervisor/mentor only).
 * Optionally includes a digital signature for audit trail.
 * Awards XP to the assignee on VERIFIED.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(
      payload,
      "SUPERVISOR",
      "MENTOR",
      "INSTRUCTOR",
      "ORG_ADMIN",
      "SUPER_ADMIN"
    );

    const { taskId } = await params;
    const body = await req.json();
    const { result, digitalSignature } = verifySchema.parse(body);

    const updated = await verifyTask(
      taskId,
      payload.sub,
      result,
      digitalSignature
    );

    return success(updated);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
