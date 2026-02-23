import { NextRequest } from "next/server";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "progress";
    const programId = url.searchParams.get("programId");
    const orgId = url.searchParams.get("orgId") || payload.orgId;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    if (type === "progress") {
      const enrollments = await prisma.courseEnrollment.findMany({
        where: {
          course: { organizationId: orgId },
          ...(programId ? { course: { programCourses: { some: { programId } } } } : {}),
        },
        include: {
          user: { select: { id: true, name: true } },
          course: { include: { translations: { where: { locale: "en" }, take: 1 } } },
        },
        orderBy: { progressPct: "desc" },
      });

      return success({
        type: "progress",
        totalEnrollments: enrollments.length,
        avgProgress: enrollments.reduce((s, e) => s + e.progressPct, 0) / (enrollments.length || 1),
        data: enrollments.map((e) => ({
          userId: e.user.id,
          userName: e.user.name,
          courseTitle: e.course.translations[0]?.title || "Untitled",
          progress: e.progressPct,
          enrolledAt: e.createdAt,
        })),
      });
    }

    if (type === "competency") {
      const assessments = await prisma.competencyAssessment.findMany({
        where: {
          user: { memberships: { some: { organizationId: orgId } } },
          ...(Object.keys(dateFilter).length > 0 ? { assessedAt: dateFilter } : {}),
        },
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { assessedAt: "desc" },
      });

      return success({
        type: "competency",
        totalAssessments: assessments.length,
        data: assessments.map((a) => ({
          userId: a.user.id,
          userName: a.user.name,
          courseId: a.courseId,
          overallScore: a.overallScore,
          competencies: a.competencies,
          assessedAt: a.assessedAt,
        })),
      });
    }

    if (type === "impact") {
      const metrics = await prisma.impactMetric.findMany({
        where: {
          organizationId: orgId,
        },
        include: {
          organization: { select: { id: true, name: true } },
        },
        orderBy: { period: "desc" },
      });

      const costs = await prisma.costRecord.findMany({
        where: {
          organizationId: orgId,
          ...(programId ? { programId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return success({
        type: "impact",
        metrics,
        costs,
      });
    }

    return success({ type, message: "Unknown report type" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
