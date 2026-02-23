import { NextRequest } from "next/server";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || payload.sub;
    const courseId = url.searchParams.get("courseId");

    const where: Record<string, unknown> = { userId };
    if (courseId) where.courseId = courseId;

    const assessments = await prisma.competencyAssessment.findMany({
      where,
      orderBy: { assessedAt: "desc" },
    });

    return success(assessments.map((a) => ({
      id: a.id,
      courseId: a.courseId,
      overallScore: a.overallScore,
      competencies: a.competencies,
      assessedAt: a.assessedAt,
    })));
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
