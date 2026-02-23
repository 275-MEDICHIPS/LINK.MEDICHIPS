import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  listUserCertificates,
  checkEligibility,
  issueCertificate,
} from "@/lib/services/certificate.service";
import { triggerEvent } from "@/lib/services/notification.service";

const issueCertificateSchema = z.object({
  courseId: z.string().min(1),
  templateId: z.string().min(1),
});

/**
 * GET /api/v1/certificates
 * List all certificates for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const certificates = await listUserCertificates(payload.sub);

    return success(certificates);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * POST /api/v1/certificates
 * Request certificate issuance (checks eligibility first)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const input = issueCertificateSchema.parse(body);

    // Check eligibility first
    const eligibility = await checkEligibility(payload.sub, input.courseId);
    if (!eligibility.eligible) {
      return success(
        {
          issued: false,
          eligibility,
        },
        200
      );
    }

    // Issue certificate
    const certificate = await issueCertificate(
      payload.sub,
      input.courseId,
      input.templateId
    );

    // Trigger notification
    await triggerEvent("CERTIFICATE_ISSUED", {
      userId: payload.sub,
      data: {
        certificateId: certificate.id,
        issueNumber: certificate.issueNumber,
      },
    });

    return success(
      {
        issued: true,
        certificate,
        eligibility,
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
