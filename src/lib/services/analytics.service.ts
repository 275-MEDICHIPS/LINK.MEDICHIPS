import { prisma } from "@/lib/db/prisma";
import { cacheGet, cacheSet } from "@/lib/cache/redis";

export const analyticsService = {
  /**
   * Admin operational dashboard.
   */
  async getOperationalDashboard(orgId: string) {
    const cacheKey = `analytics:ops:${orgId}`;
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const [
      totalLearners,
      activeLearners,
      totalCourses,
      publishedCourses,
      avgCompletion,
      pendingReviews,
      recentEnrollments,
    ] = await Promise.all([
      prisma.organizationMembership.count({
        where: { organizationId: orgId, role: "LEARNER", isActive: true },
      }),
      prisma.user.count({
        where: {
          memberships: { some: { organizationId: orgId, role: "LEARNER" } },
          lastActiveAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.course.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.course.count({
        where: { organizationId: orgId, isPublished: true, deletedAt: null },
      }),
      prisma.courseEnrollment.aggregate({
        where: {
          course: { organizationId: orgId },
        },
        _avg: { progressPct: true },
      }),
      prisma.contentVersion.count({
        where: {
          status: "IN_REVIEW",
          lesson: { module: { course: { organizationId: orgId } } },
        },
      }),
      prisma.courseEnrollment.count({
        where: {
          course: { organizationId: orgId },
          enrolledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const result = {
      totalLearners,
      activeLearners,
      totalCourses,
      publishedCourses,
      avgCompletionPct: Math.round(avgCompletion._avg.progressPct || 0),
      pendingReviews,
      recentEnrollments,
    };

    await cacheSet(cacheKey, result, 300); // 5 min cache
    return result;
  },

  /**
   * KOICA impact dashboard.
   */
  async getImpactDashboard(orgId: string) {
    const cacheKey = `analytics:impact:${orgId}`;
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const [
      metrics,
      costs,
      outcomes,
      completionsByCountry,
      competencyRate,
    ] = await Promise.all([
      prisma.impactMetric.findMany({
        where: { organizationId: orgId },
        orderBy: { period: "desc" },
        take: 12,
      }),
      prisma.costRecord.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.outcomeRecord.count({
        where: { program: { organizationId: orgId } },
      }),
      prisma.programEnrollment.groupBy({
        by: ["programId"],
        where: {
          program: { organizationId: orgId },
          completedAt: { not: null },
        },
        _count: true,
      }),
      prisma.verificationRecord.groupBy({
        by: ["result"],
        where: {
          type: { in: ["SUPERVISOR_L2", "MENTOR_L3"] },
        },
        _count: true,
      }),
    ]);

    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
    const totalTrained = competencyRate.reduce((sum, c) => sum + c._count, 0);
    const passCount =
      competencyRate.find((c) => c.result === "PASS")?._count || 0;

    const result = {
      metrics,
      totalCost,
      costPerWorker:
        totalTrained > 0 ? Math.round(totalCost / totalTrained) : 0,
      totalOutcomes: outcomes,
      competencyRate:
        totalTrained > 0
          ? Math.round((passCount / totalTrained) * 100)
          : 0,
      completionsByProgram: completionsByCountry,
    };

    await cacheSet(cacheKey, result, 900); // 15 min cache
    return result;
  },

  /**
   * Record impact metric.
   */
  async recordImpactMetric(data: {
    organizationId: string;
    period: string;
    metricType: string;
    value: number;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.impactMetric.upsert({
      where: {
        organizationId_period_metricType: {
          organizationId: data.organizationId,
          period: data.period,
          metricType: data.metricType,
        },
      },
      update: { value: data.value, metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined },
      create: {
        organizationId: data.organizationId,
        period: data.period,
        metricType: data.metricType,
        value: data.value,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });
  },

  /**
   * Record cost.
   */
  async recordCost(data: {
    organizationId: string;
    programId?: string;
    category: string;
    amount: number;
    currency?: string;
    period: string;
    notes?: string;
  }) {
    return prisma.costRecord.create({ data });
  },
};
