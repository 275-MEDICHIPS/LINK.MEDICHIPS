/**
 * GET /api/v1/admin/video-production/templates — List prompt templates
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const category = req.nextUrl.searchParams.get("category") || undefined;
    const locale = req.nextUrl.searchParams.get("locale") || undefined;

    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (locale) where.locale = locale;

    const templates = await prisma.promptTemplate.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return success(templates);
  } catch (error) {
    return handleError(error);
  }
}
