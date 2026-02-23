import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";

// ==================== CONSTANTS ====================

const PASS_THRESHOLD = 0.8; // 80% on final assessment
const CERT_SALT = process.env.CERTIFICATE_SALT ?? "medichips-link-cert-salt";

// ==================== ELIGIBILITY ====================

/**
 * Check if a user is eligible for certification in a course.
 * Requirements:
 *  - All required lessons completed
 *  - Final assessment (last quiz) score >= 80%
 */
export async function checkEligibility(
  userId: string,
  courseId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  lessonsCompleted: number;
  lessonsRequired: number;
  assessmentScore: number | null;
}> {
  // Get all required lessons for the course
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: {
          lessons: {
            where: { isRequired: true, deletedAt: null },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  const requiredLessons = course.modules.flatMap((m) => m.lessons);
  const requiredLessonIds = requiredLessons.map((l) => l.id);

  // Check lesson completion
  const completedLessons = await prisma.lessonProgress.count({
    where: {
      userId,
      lessonId: { in: requiredLessonIds },
      status: "COMPLETED",
    },
  });

  if (completedLessons < requiredLessonIds.length) {
    return {
      eligible: false,
      reason: `Completed ${completedLessons}/${requiredLessonIds.length} required lessons`,
      lessonsCompleted: completedLessons,
      lessonsRequired: requiredLessonIds.length,
      assessmentScore: null,
    };
  }

  // Check final assessment score (best quiz attempt for the last lesson with QUIZ type)
  const quizLessons = requiredLessons.filter(
    (l) => l.contentType === "QUIZ"
  );
  const finalQuizLesson = quizLessons[quizLessons.length - 1];

  let assessmentScore: number | null = null;

  if (finalQuizLesson) {
    const bestAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId,
        lessonId: finalQuizLesson.id,
        passed: true,
      },
      orderBy: { score: "desc" },
    });

    assessmentScore = bestAttempt?.score ?? null;

    if (!bestAttempt || bestAttempt.score < PASS_THRESHOLD) {
      return {
        eligible: false,
        reason: `Final assessment score ${assessmentScore !== null ? `${Math.round(assessmentScore * 100)}%` : "not attempted"} (requires 80%+)`,
        lessonsCompleted: completedLessons,
        lessonsRequired: requiredLessonIds.length,
        assessmentScore,
      };
    }
  }

  return {
    eligible: true,
    lessonsCompleted: completedLessons,
    lessonsRequired: requiredLessonIds.length,
    assessmentScore,
  };
}

// ==================== CERTIFICATE ISSUANCE ====================

/**
 * Generate a unique issue number: LINK-YYYY-XXXXX
 */
function generateIssueNumber(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `LINK-${year}-${random}`;
}

/**
 * Generate verification hash: SHA-256(certId + userId + courseId + issuedAt + salt)
 */
function generateVerificationHash(
  certId: string,
  userId: string,
  courseId: string,
  issuedAt: Date
): string {
  const data = `${certId}${userId}${courseId}${issuedAt.toISOString()}${CERT_SALT}`;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Issue a certificate to a user for a course.
 * For L3 courses, mentor approval is required before issuance.
 */
export async function issueCertificate(
  userId: string,
  courseId: string,
  templateId: string
) {
  // Verify eligibility
  const eligibility = await checkEligibility(userId, courseId);
  if (!eligibility.eligible) {
    throw new ApiError(
      `Not eligible: ${eligibility.reason}`,
      400,
      "NOT_ELIGIBLE"
    );
  }

  // Check for existing active certificate
  const existing = await prisma.issuedCertificate.findFirst({
    where: {
      userId,
      courseId,
      revokedAt: null,
    },
  });

  if (existing) {
    throw new ApiError(
      "Certificate already issued for this course",
      409,
      "ALREADY_ISSUED"
    );
  }

  // For L3 courses, verify mentor approval exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { riskLevel: true },
  });

  if (course?.riskLevel === "L3") {
    const mentorVerification = await prisma.verificationRecord.findFirst({
      where: {
        userId,
        type: "MENTOR_L3",
        result: "PASS",
        entityType: "course",
        entityId: courseId,
      },
    });

    if (!mentorVerification) {
      throw new ApiError(
        "L3 course requires mentor approval before certificate issuance",
        403,
        "MENTOR_APPROVAL_REQUIRED"
      );
    }
  }

  // Verify template exists
  const template = await prisma.certificateTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || !template.isActive) {
    throw new ApiError(
      "Certificate template not found or inactive",
      404,
      "TEMPLATE_NOT_FOUND"
    );
  }

  // Generate unique issue number (retry on collision)
  let issueNumber: string;
  let attempts = 0;
  const maxAttempts = 5;

  do {
    issueNumber = generateIssueNumber();
    const exists = await prisma.issuedCertificate.findUnique({
      where: { issueNumber },
    });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new ApiError(
      "Failed to generate unique issue number",
      500,
      "ISSUE_NUMBER_COLLISION"
    );
  }

  const issuedAt = new Date();
  const certId = undefined; // Will be assigned by Prisma

  // Create certificate
  const certificate = await prisma.issuedCertificate.create({
    data: {
      userId,
      templateId,
      courseId,
      issueNumber,
      verificationHash: "placeholder", // Will update after creation
      issuedAt,
    },
  });

  // Now generate verification hash with the actual cert ID
  const verificationHash = generateVerificationHash(
    certificate.id,
    userId,
    courseId,
    issuedAt
  );

  const updated = await prisma.issuedCertificate.update({
    where: { id: certificate.id },
    data: { verificationHash },
    include: {
      user: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
    },
  });

  return updated;
}

// ==================== PDF GENERATION ====================

/**
 * Generate PDF for a certificate.
 * Placeholder implementation - actual rendering uses Puppeteer.
 */
export async function generatePdf(certificateId: string): Promise<string> {
  const certificate = await prisma.issuedCertificate.findUnique({
    where: { id: certificateId },
    include: {
      user: { select: { name: true, email: true } },
      template: true,
    },
  });

  if (!certificate) {
    throw new ApiError("Certificate not found", 404, "CERT_NOT_FOUND");
  }

  if (certificate.revokedAt) {
    throw new ApiError(
      "Cannot generate PDF for revoked certificate",
      400,
      "CERT_REVOKED"
    );
  }

  // TODO: Implement actual PDF generation with Puppeteer
  // 1. Render template.htmlTemplate with Handlebars using certificate data
  // 2. Use Puppeteer to convert HTML to PDF
  // 3. Upload PDF to GCS
  // 4. Update certificate pdfUrl
  // Placeholder: return a URL pattern that will be implemented
  const pdfUrl = `/api/v1/certificates/${certificateId}/pdf`;

  await prisma.issuedCertificate.update({
    where: { id: certificateId },
    data: { pdfUrl },
  });

  return pdfUrl;
}

// ==================== VERIFICATION ====================

/**
 * Verify a certificate by its issue number.
 * Public endpoint - no auth required.
 */
export async function verifyCertificate(issueNumber: string) {
  const certificate = await prisma.issuedCertificate.findUnique({
    where: { issueNumber },
    include: {
      user: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  });

  if (!certificate) {
    return {
      valid: false,
      reason: "Certificate not found",
    };
  }

  // Get course info for display
  const course = await prisma.course.findUnique({
    where: { id: certificate.courseId },
    include: {
      translations: {
        where: { locale: "en" },
        take: 1,
      },
    },
  });

  const isRevoked = certificate.revokedAt !== null;
  const isExpired =
    certificate.expiresAt !== null && certificate.expiresAt < new Date();

  return {
    valid: !isRevoked && !isExpired,
    issueNumber: certificate.issueNumber,
    holderName: certificate.user.name,
    courseName: course?.translations[0]?.title ?? "Unknown Course",
    courseId: certificate.courseId,
    templateName: certificate.template.name,
    issuedAt: certificate.issuedAt,
    expiresAt: certificate.expiresAt,
    verificationHash: certificate.verificationHash,
    revoked: isRevoked,
    revokedAt: certificate.revokedAt,
    revokedReason: certificate.revokedReason,
    expired: isExpired,
  };
}

// ==================== REVOCATION ====================

/**
 * Revoke a certificate with reason and admin tracking.
 */
export async function revokeCertificate(
  certificateId: string,
  reason: string,
  adminId: string
) {
  const certificate = await prisma.issuedCertificate.findUnique({
    where: { id: certificateId },
  });

  if (!certificate) {
    throw new ApiError("Certificate not found", 404, "CERT_NOT_FOUND");
  }

  if (certificate.revokedAt) {
    throw new ApiError(
      "Certificate is already revoked",
      400,
      "ALREADY_REVOKED"
    );
  }

  const updated = await prisma.issuedCertificate.update({
    where: { id: certificateId },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  // Create audit log
  await prisma.contentAuditLog.create({
    data: {
      entityType: "certificate",
      entityId: certificateId,
      action: "REVOKE",
      previousState: { revokedAt: null },
      newState: { revokedAt: updated.revokedAt, revokedReason: reason },
      userId: adminId,
    },
  });

  return updated;
}

// ==================== LIST & GET ====================

/**
 * List all certificates for a user.
 */
export async function listUserCertificates(userId: string) {
  const certificates = await prisma.issuedCertificate.findMany({
    where: { userId },
    include: {
      template: { select: { id: true, name: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  // Enrich with course names
  const courseIds = [...new Set(certificates.map((c) => c.courseId))];
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    include: {
      translations: {
        where: { locale: "en" },
        take: 1,
      },
    },
  });

  const courseMap = new Map(
    courses.map((c) => [c.id, c.translations[0]?.title ?? "Unknown Course"])
  );

  return certificates.map((cert) => ({
    id: cert.id,
    issueNumber: cert.issueNumber,
    courseId: cert.courseId,
    courseName: courseMap.get(cert.courseId) ?? "Unknown Course",
    templateName: cert.template.name,
    verificationHash: cert.verificationHash,
    pdfUrl: cert.pdfUrl,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    revokedAt: cert.revokedAt,
    revokedReason: cert.revokedReason,
    isValid: cert.revokedAt === null &&
      (cert.expiresAt === null || cert.expiresAt > new Date()),
  }));
}

/**
 * Get a single certificate by ID.
 */
export async function getCertificate(certificateId: string) {
  const certificate = await prisma.issuedCertificate.findUnique({
    where: { id: certificateId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      template: { select: { id: true, name: true } },
    },
  });

  if (!certificate) {
    throw new ApiError("Certificate not found", 404, "CERT_NOT_FOUND");
  }

  const course = await prisma.course.findUnique({
    where: { id: certificate.courseId },
    include: {
      translations: {
        where: { locale: "en" },
        take: 1,
      },
    },
  });

  return {
    ...certificate,
    courseName: course?.translations[0]?.title ?? "Unknown Course",
    isValid:
      certificate.revokedAt === null &&
      (certificate.expiresAt === null || certificate.expiresAt > new Date()),
  };
}
