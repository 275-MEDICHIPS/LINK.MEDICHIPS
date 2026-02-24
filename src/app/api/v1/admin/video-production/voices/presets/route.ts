/**
 * GET  /api/v1/admin/video-production/voices/presets — List voice presets
 * POST /api/v1/admin/video-production/voices/presets — Create voice preset
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";

const createPresetSchema = z.object({
  name: z.string().min(1).max(100),
  ttsVoiceName: z.string().min(1),
  languageCode: z.string().min(2),
  gender: z.enum(["MALE", "FEMALE", "NEUTRAL"]),
  voiceType: z.string().default("Neural2"),
  sampleAudioUrl: z.string().url().optional(),
  speakingRate: z.number().min(0.25).max(4.0).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
  isGlobal: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const languageCode = req.nextUrl.searchParams.get("language") || undefined;
    const gender = req.nextUrl.searchParams.get("gender") || undefined;

    const where: Record<string, unknown> = { isActive: true };
    if (languageCode) where.languageCode = { startsWith: languageCode };
    if (gender) where.gender = gender.toUpperCase();

    const presets = await prisma.voicePreset.findMany({
      where,
      orderBy: [{ languageCode: "asc" }, { name: "asc" }],
    });

    return success(presets);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = createPresetSchema.parse(body);

    const preset = await prisma.voicePreset.create({
      data: input,
    });

    return success(preset, 201);
  } catch (error) {
    return handleError(error);
  }
}
