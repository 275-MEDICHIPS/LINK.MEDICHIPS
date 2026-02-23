import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import { Prisma } from "@prisma/client";
import type { ContentReviewStatus, RiskLevel } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface ReviewAction {
  versionId: string;
  action: "approve" | "reject";
  reason?: string;
}

export interface ContentVersionFilters {
  page?: number;
  pageSize?: number;
  status?: ContentReviewStatus;
  riskLevel?: RiskLevel;
  isAiGenerated?: boolean;
}

// ─── Risk-level approval rule matrix (FIX-3) ────────────────────────
//
//  L1: auto-publish if instructor-created; 1 review if AI-generated
//  L2: 1 reviewer + OrgAdmin; 2 reviewers if AI-generated
//  L3: 2 reviewers + OrgAdmin + SuperAdmin; AI auto-publish blocked
//

interface ApprovalRule {
  minReviewers: number;
  minReviewersAi: number;
  requireOrgAdmin: boolean;
  requireSuperAdmin: boolean;
  blockAiAutoPublish: boolean;
}

const APPROVAL_RULES: Record<RiskLevel, ApprovalRule> = {
  L1: {
    minReviewers: 0,
    minReviewersAi: 1,
    requireOrgAdmin: false,
    requireSuperAdmin: false,
    blockAiAutoPublish: false,
  },
  L2: {
    minReviewers: 1,
    minReviewersAi: 2,
    requireOrgAdmin: true,
    requireSuperAdmin: false,
    blockAiAutoPublish: false,
  },
  L3: {
    minReviewers: 2,
    minReviewersAi: 2,
    requireOrgAdmin: true,
    requireSuperAdmin: true,
    blockAiAutoPublish: true,
  },
};

// ─── Content Version CRUD ────────────────────────────────────────────

/**
 * Create a new content version (append-only chain).
 */
export async function createVersion(
  lessonId: string,
  body: unknown,
  isAiGenerated = false
) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
  });
  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  const latestVersion = await prisma.contentVersion.findFirst({
    where: { lessonId },
    orderBy: { version: "desc" },
  });

  const version = await prisma.contentVersion.create({
    data: {
      lessonId,
      version: (latestVersion?.version ?? 0) + 1,
      body: body as object,
      status: "DRAFT",
      isAiGenerated,
      previousVersionId: latestVersion?.id,
    },
  });

  return version;
}

/**
 * Get the latest published version for a lesson in a given locale.
 */
export async function getPublishedVersion(
  lessonId: string,
  _locale = "en"
) {
  const version = await prisma.contentVersion.findFirst({
    where: {
      lessonId,
      status: "PUBLISHED",
    },
    orderBy: { version: "desc" },
    include: {
      reviewComments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!version) {
    throw new ApiError(
      "No published version found",
      404,
      "NO_PUBLISHED_VERSION"
    );
  }

  return version;
}

/**
 * Submit a draft version for review: DRAFT -> IN_REVIEW.
 */
export async function submitForReview(
  versionId: string,
  userId: string
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) {
    throw new ApiError("Version not found", 404, "VERSION_NOT_FOUND");
  }
  if (version.status !== "DRAFT") {
    throw new ApiError(
      `Cannot submit version in status ${version.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updated = await prisma.contentVersion.update({
    where: { id: versionId },
    data: { status: "IN_REVIEW" },
  });

  // Create audit log
  await prisma.contentAuditLog.create({
    data: {
      entityType: "content_version",
      entityId: versionId,
      action: "SUBMIT_FOR_REVIEW",
      previousState: { status: "DRAFT" },
      newState: { status: "IN_REVIEW" },
      userId,
    },
  });

  return updated;
}

/**
 * Approve a version (risk-based rules, FIX-3).
 *
 * Checks risk level of the parent course, counts existing approvals,
 * and either marks APPROVED or auto-publishes when thresholds are met.
 */
export async function approveVersion(
  versionId: string,
  reviewerId: string
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      },
    },
  });

  if (!version) {
    throw new ApiError("Version not found", 404, "VERSION_NOT_FOUND");
  }
  if (version.status !== "IN_REVIEW" && version.status !== "APPROVED") {
    throw new ApiError(
      `Cannot approve version in status ${version.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const course = version.lesson.module.course;
  const riskLevel = course.riskLevel;
  const rules = APPROVAL_RULES[riskLevel];

  // Block AI auto-publish for L3
  if (rules.blockAiAutoPublish && version.isAiGenerated) {
    // L3 AI content can be approved but NOT auto-published
    // It will stay in APPROVED until manual publish
  }

  // Get reviewer's role
  const reviewer = await prisma.organizationMembership.findFirst({
    where: {
      userId: reviewerId,
      organizationId: course.organizationId,
      isActive: true,
    },
  });

  const isSuperAdmin = await prisma.organizationMembership.findFirst({
    where: {
      userId: reviewerId,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const reviewerRole = isSuperAdmin
    ? "SUPER_ADMIN"
    : reviewer?.role ?? null;

  // Record the approval in audit log
  await prisma.contentAuditLog.create({
    data: {
      entityType: "content_version",
      entityId: versionId,
      action: "APPROVE",
      previousState: { status: version.status },
      newState: { status: "APPROVED", reviewerRole },
      userId: reviewerId,
    },
  });

  // Also log course-level approval for publish gating
  await prisma.contentAuditLog.create({
    data: {
      entityType: "course",
      entityId: course.id,
      action: "APPROVE",
      previousState: Prisma.JsonNull,
      newState: {
        versionId,
        reviewerRole: reviewerRole ?? "UNKNOWN",
      },
      userId: reviewerId,
    },
  });

  // Count approvals for this version
  const approvalLogs = await prisma.contentAuditLog.findMany({
    where: {
      entityType: "content_version",
      entityId: versionId,
      action: "APPROVE",
    },
    include: {
      user: {
        include: {
          memberships: {
            where: {
              organizationId: course.organizationId,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const totalReviewers = approvalLogs.length;
  const hasOrgAdmin = approvalLogs.some((log) =>
    log.user.memberships.some((m) => m.role === "ORG_ADMIN")
  );
  const hasSuperAdmin = await prisma.contentAuditLog.findFirst({
    where: {
      entityType: "content_version",
      entityId: versionId,
      action: "APPROVE",
      user: {
        memberships: {
          some: { role: "SUPER_ADMIN" },
        },
      },
    },
  });

  const requiredReviewers = version.isAiGenerated
    ? rules.minReviewersAi
    : rules.minReviewers;
  const orgAdminSatisfied = !rules.requireOrgAdmin || hasOrgAdmin;
  const superAdminSatisfied = !rules.requireSuperAdmin || !!hasSuperAdmin;

  const allRequirementsMet =
    totalReviewers >= requiredReviewers &&
    orgAdminSatisfied &&
    superAdminSatisfied;

  if (allRequirementsMet) {
    // Auto-publish for L1 non-AI content, or when all thresholds met
    const shouldAutoPublish =
      !rules.blockAiAutoPublish || !version.isAiGenerated;

    if (shouldAutoPublish) {
      const published = await prisma.contentVersion.update({
        where: { id: versionId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await prisma.contentAuditLog.create({
        data: {
          entityType: "content_version",
          entityId: versionId,
          action: "AUTO_PUBLISH",
          previousState: { status: version.status },
          newState: { status: "PUBLISHED" },
          userId: reviewerId,
        },
      });

      return published;
    }

    // For L3 AI: mark approved, but require manual publish
    const approved = await prisma.contentVersion.update({
      where: { id: versionId },
      data: { status: "APPROVED" },
    });

    return approved;
  }

  // Not enough approvals yet — mark as APPROVED (partial)
  const approved = await prisma.contentVersion.update({
    where: { id: versionId },
    data: { status: version.status === "APPROVED" ? "APPROVED" : "IN_REVIEW" },
  });

  return approved;
}

/**
 * Reject a version.
 */
export async function rejectVersion(
  versionId: string,
  reviewerId: string,
  reason: string
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) {
    throw new ApiError("Version not found", 404, "VERSION_NOT_FOUND");
  }
  if (version.status !== "IN_REVIEW" && version.status !== "APPROVED") {
    throw new ApiError(
      `Cannot reject version in status ${version.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updated = await prisma.contentVersion.update({
    where: { id: versionId },
    data: { status: "DRAFT" },
  });

  await prisma.contentAuditLog.create({
    data: {
      entityType: "content_version",
      entityId: versionId,
      action: "REJECT",
      previousState: { status: version.status },
      newState: { status: "DRAFT", reason },
      userId: reviewerId,
    },
  });

  // Add rejection reason as a review comment
  await prisma.reviewComment.create({
    data: {
      contentVersionId: versionId,
      userId: reviewerId,
      body: `[REJECTION] ${reason}`,
    },
  });

  return updated;
}

/**
 * Manually publish a version (IN_REVIEW or APPROVED -> PUBLISHED).
 */
export async function publishVersion(
  versionId: string,
  userId: string
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) {
    throw new ApiError("Version not found", 404, "VERSION_NOT_FOUND");
  }
  if (version.status !== "IN_REVIEW" && version.status !== "APPROVED") {
    throw new ApiError(
      `Cannot publish version in status ${version.status}`,
      400,
      "INVALID_STATUS_TRANSITION"
    );
  }

  // Archive previously published versions for this lesson
  await prisma.contentVersion.updateMany({
    where: {
      lessonId: version.lessonId,
      status: "PUBLISHED",
      id: { not: versionId },
    },
    data: { status: "ARCHIVED" },
  });

  const published = await prisma.contentVersion.update({
    where: { id: versionId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  await prisma.contentAuditLog.create({
    data: {
      entityType: "content_version",
      entityId: versionId,
      action: "PUBLISH",
      previousState: { status: version.status },
      newState: { status: "PUBLISHED" },
      userId,
    },
  });

  return published;
}

/**
 * Get audit trail for an entity.
 */
export async function getAuditLog(entityType: string, entityId: string) {
  const logs = await prisma.contentAuditLog.findMany({
    where: { entityType, entityId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return logs;
}

/**
 * Add a review comment (supports threading via parentId).
 */
export async function addReviewComment(
  versionId: string,
  userId: string,
  body: string,
  parentId?: string
) {
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
  });
  if (!version) {
    throw new ApiError("Version not found", 404, "VERSION_NOT_FOUND");
  }

  if (parentId) {
    const parent = await prisma.reviewComment.findUnique({
      where: { id: parentId },
    });
    if (!parent || parent.contentVersionId !== versionId) {
      throw new ApiError(
        "Parent comment not found or does not belong to this version",
        400,
        "INVALID_PARENT_COMMENT"
      );
    }
  }

  const comment = await prisma.reviewComment.create({
    data: {
      contentVersionId: versionId,
      userId,
      body,
      parentId,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return comment;
}

/**
 * List content versions pending review, with risk-level filtering.
 */
export async function listPendingReviews(
  filters: ContentVersionFilters = {}
) {
  const {
    page = 1,
    pageSize = 20,
    status = "IN_REVIEW",
    riskLevel,
    isAiGenerated,
  } = filters;

  const where: Record<string, unknown> = {
    status,
    lesson: {
      deletedAt: null,
      module: {
        deletedAt: null,
        course: {
          deletedAt: null,
          ...(riskLevel && { riskLevel }),
        },
      },
    },
  };

  if (isAiGenerated !== undefined) {
    where.isAiGenerated = isAiGenerated;
  }

  const [versions, total] = await prisma.$transaction([
    prisma.contentVersion.findMany({
      where,
      include: {
        lesson: {
          include: {
            translations: true,
            module: {
              include: {
                translations: true,
                course: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
          },
        },
        reviewComments: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contentVersion.count({ where }),
  ]);

  return { versions, total, page, pageSize };
}
