import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getImprovementPlan,
  generateImprovementPlan,
} from "@/lib/services/improvement.service";

const generatePlanSchema = z.object({
  courseId: z.string().min(1),
});

/**
 * GET /api/v1/improvement-plans
 *
 * Get the current (most recent, non-completed) improvement plan for the
 * authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const plan = await getImprovementPlan(payload.sub);

    if (!plan) {
      return success(null);
    }

    return success(plan);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * POST /api/v1/improvement-plans
 *
 * Generate a new improvement plan by analyzing quiz scores, task outcomes,
 * and verification results for the specified course. Identifies weak areas
 * and produces actionable recommendations.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const { courseId } = generatePlanSchema.parse(body);

    const plan = await generateImprovementPlan(payload.sub, courseId);
    return success(plan, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
