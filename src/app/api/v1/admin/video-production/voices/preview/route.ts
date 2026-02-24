/**
 * POST /api/v1/admin/video-production/voices/preview — Generate voice preview audio
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { generateVoicePreview } from "@/lib/tts/google-tts";

const previewSchema = z.object({
  voiceName: z.string().min(1),
  languageCode: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = previewSchema.parse(body);

    const audioBase64 = await generateVoicePreview(
      input.voiceName,
      input.languageCode
    );

    return success({ audioBase64, contentType: "audio/mpeg" });
  } catch (error) {
    return handleError(error);
  }
}
