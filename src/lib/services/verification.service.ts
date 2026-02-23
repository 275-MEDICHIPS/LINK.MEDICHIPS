import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import type {
  VerificationType,
  VerificationResult,
  RiskLevel,
  Prisma,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateVerificationData {
  userId: string;
  type: VerificationType;
  entityType: string;
  entityId: string;
  result: VerificationResult;
  verifierId?: string;
  aiConfidence?: number;
  digitalSignature?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

interface VerificationRequirement {
  requiredLevels: VerificationType[];
  description: string;
  aiThreshold?: number;
  requiresSupervisor: boolean;
  requiresMentor: boolean;
}

// ---------------------------------------------------------------------------
// Core verification operations
// ---------------------------------------------------------------------------

/**
 * Create a verification record.
 */
export async function createVerification(data: CreateVerificationData) {
  // Validate verifier exists if provided
  if (data.verifierId) {
    const verifier = await prisma.user.findUnique({
      where: { id: data.verifierId },
    });
    if (!verifier) {
      throw new ApiError("Verifier not found", 404);
    }
  }

  const record = await prisma.verificationRecord.create({
    data: {
      userId: data.userId,
      type: data.type,
      entityType: data.entityType,
      entityId: data.entityId,
      result: data.result,
      verifierId: data.verifierId,
      aiConfidence: data.aiConfidence,
      digitalSignature: data.digitalSignature,
      notes: data.notes,
      metadata: data.metadata as Prisma.InputJsonValue ?? undefined,
    },
  });

  return record;
}

/**
 * Get all verification records for a specific entity.
 */
export async function getVerifications(entityType: string, entityId: string) {
  return prisma.verificationRecord.findMany({
    where: { entityType, entityId },
    include: {
      verifier: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * L1 auto-verification using AI confidence score.
 * AI evaluates the submission and assigns a confidence level.
 */
export async function submitAiVerification(
  userId: string,
  entityType: string,
  entityId: string
) {
  // For now, generate a placeholder AI confidence.
  // In production, this would call the Claude API for evaluation.
  const aiConfidence = await evaluateWithAi(entityType, entityId);

  const result: VerificationResult =
    aiConfidence >= 0.85
      ? "PASS"
      : aiConfidence >= 0.6
        ? "CONDITIONAL"
        : "FAIL";

  const record = await createVerification({
    userId,
    type: "AI_L1",
    entityType,
    entityId,
    result,
    aiConfidence,
    notes: `AI auto-verification with confidence ${(aiConfidence * 100).toFixed(1)}%`,
  });

  return {
    ...record,
    requiresHumanReview: result !== "PASS",
    nextStep:
      result === "PASS"
        ? null
        : result === "CONDITIONAL"
          ? "SUPERVISOR_L2"
          : "RESUBMIT",
  };
}

/**
 * L2 supervisor verification with digital signature.
 */
export async function submitSupervisorVerification(
  verifierId: string,
  entityType: string,
  entityId: string,
  result: VerificationResult,
  digitalSignature: string
) {
  // Verify the verifier has SUPERVISOR or higher role
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: verifierId,
      role: { in: ["SUPERVISOR", "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
  });

  if (!membership) {
    throw new ApiError("User is not authorized as a supervisor", 403);
  }

  if (!digitalSignature) {
    throw new ApiError("Digital signature is required for L2 verification", 400);
  }

  // Get the entity's userId for the verification record
  const existingVerifications = await prisma.verificationRecord.findFirst({
    where: { entityType, entityId },
    select: { userId: true },
  });

  if (!existingVerifications) {
    throw new ApiError("No prior verification found for this entity", 404);
  }

  const record = await createVerification({
    userId: existingVerifications.userId,
    type: "SUPERVISOR_L2",
    entityType,
    entityId,
    result,
    verifierId,
    digitalSignature,
    notes: `Supervisor verification by ${verifierId}`,
  });

  return record;
}

/**
 * L3 mentor verification with notes.
 */
export async function submitMentorVerification(
  verifierId: string,
  entityType: string,
  entityId: string,
  result: VerificationResult,
  notes?: string
) {
  // Verify the verifier has MENTOR or higher role
  const membership = await prisma.organizationMembership.findFirst({
    where: {
      userId: verifierId,
      role: { in: ["MENTOR", "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
  });

  if (!membership) {
    throw new ApiError("User is not authorized as a mentor", 403);
  }

  // Get the entity's userId
  const existingVerification = await prisma.verificationRecord.findFirst({
    where: { entityType, entityId },
    select: { userId: true },
  });

  if (!existingVerification) {
    throw new ApiError("No prior verification found for this entity", 404);
  }

  const record = await createVerification({
    userId: existingVerification.userId,
    type: "MENTOR_L3",
    entityType,
    entityId,
    result,
    verifierId,
    notes: notes ?? `Mentor verification by ${verifierId}`,
  });

  return record;
}

/**
 * Determine what verifications are needed based on risk level (FIX-3).
 *
 * L1 (Low risk): AI auto-verify sufficient
 * L2 (Medium risk): AI + Supervisor required
 * L3 (High risk): AI + Supervisor + Mentor required
 */
export function getVerificationRequirements(
  riskLevel: RiskLevel
): VerificationRequirement {
  switch (riskLevel) {
    case "L1":
      return {
        requiredLevels: ["AI_L1"],
        description:
          "Low-risk content: AI auto-verification is sufficient. Human review optional.",
        aiThreshold: 0.85,
        requiresSupervisor: false,
        requiresMentor: false,
      };

    case "L2":
      return {
        requiredLevels: ["AI_L1", "SUPERVISOR_L2"],
        description:
          "Medium-risk content: AI verification + supervisor sign-off required.",
        aiThreshold: 0.9,
        requiresSupervisor: true,
        requiresMentor: false,
      };

    case "L3":
      return {
        requiredLevels: ["AI_L1", "SUPERVISOR_L2", "MENTOR_L3"],
        description:
          "High-risk content: AI verification + supervisor + mentor sign-off all required.",
        aiThreshold: 0.95,
        requiresSupervisor: true,
        requiresMentor: true,
      };

    default:
      throw new ApiError(`Unknown risk level: ${riskLevel}`, 400);
  }
}

/**
 * Check if all required verifications are satisfied for an entity.
 */
export async function isFullyVerified(
  entityType: string,
  entityId: string,
  riskLevel: RiskLevel
): Promise<{ verified: boolean; missing: VerificationType[] }> {
  const requirements = getVerificationRequirements(riskLevel);

  const records = await prisma.verificationRecord.findMany({
    where: {
      entityType,
      entityId,
      result: "PASS",
    },
  });

  const passedTypes = new Set(records.map((r) => r.type));
  const missing = requirements.requiredLevels.filter(
    (level) => !passedTypes.has(level)
  );

  return {
    verified: missing.length === 0,
    missing,
  };
}

// ---------------------------------------------------------------------------
// Internal: AI evaluation placeholder
// ---------------------------------------------------------------------------

async function evaluateWithAi(
  _entityType: string,
  _entityId: string
): Promise<number> {
  // TODO: Integrate with Claude API for actual AI evaluation.
  // This would analyze the submitted content/evidence and return
  // a confidence score between 0 and 1.
  //
  // For now, return a placeholder that triggers CONDITIONAL so
  // human review is always required until AI integration is complete.
  return 0.75;
}
