/**
 * GET /api/v1/admin/video-production/voices — List available TTS voices
 */

import { NextRequest } from "next/server";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { listVoices } from "@/lib/tts/google-tts";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const languageCode = req.nextUrl.searchParams.get("language") || undefined;
    const gender = req.nextUrl.searchParams.get("gender") || undefined;

    let voices = await listVoices(languageCode);

    // Filter by gender if specified
    if (gender) {
      voices = voices.filter((v) => v.ssmlGender === gender.toUpperCase());
    }

    return success(voices);
  } catch (error) {
    return handleError(error);
  }
}
