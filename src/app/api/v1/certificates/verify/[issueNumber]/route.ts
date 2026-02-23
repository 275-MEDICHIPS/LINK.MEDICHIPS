import { NextRequest } from "next/server";
import { success, handleError } from "@/lib/utils/api-response";
import { verifyCertificate } from "@/lib/services/certificate.service";

/**
 * GET /api/v1/certificates/verify/[issueNumber]
 * Public verification endpoint - no authentication required.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ issueNumber: string }> }
) {
  try {
    const { issueNumber } = await params;

    const result = await verifyCertificate(issueNumber);

    return success(result);
  } catch (error) {
    return handleError(error);
  }
}
