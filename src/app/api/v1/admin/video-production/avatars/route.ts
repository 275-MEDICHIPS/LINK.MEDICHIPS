/**
 * GET  /api/v1/admin/video-production/avatars — List avatars
 * POST /api/v1/admin/video-production/avatars — Create avatar
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  imageUrl: z.string().url(),
  gcsPath: z.string().min(1),
  gender: z.enum(["male", "female"]).optional(),
  tags: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  isGlobal: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const params = req.nextUrl.searchParams;
    const gender = params.get("gender") || undefined;
    const page = parseInt(params.get("page") || "1");
    const pageSize = parseInt(params.get("pageSize") || "50");

    const where: Record<string, unknown> = { isActive: true };
    if (gender) where.gender = gender;

    // Show global + org-specific avatars
    if (payload.orgId) {
      where.OR = [
        { isGlobal: true },
        { organizationId: payload.orgId },
      ];
    } else {
      where.isGlobal = true;
    }

    const [avatars, total] = await prisma.$transaction([
      prisma.avatar.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.avatar.count({ where }),
    ]);

    return paginated(avatars, total, page, pageSize);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = createSchema.parse(body);

    const avatar = await prisma.avatar.create({
      data: {
        name: input.name,
        imageUrl: input.imageUrl,
        gcsPath: input.gcsPath,
        gender: input.gender,
        tags: input.tags || [],
        organizationId: input.organizationId || payload.orgId,
        isGlobal: input.isGlobal ?? false,
        createdBy: payload.sub,
      },
    });

    return success(avatar, 201);
  } catch (error) {
    return handleError(error);
  }
}
