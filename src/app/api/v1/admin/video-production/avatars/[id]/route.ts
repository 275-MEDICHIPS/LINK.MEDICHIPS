/**
 * PATCH  /api/v1/admin/video-production/avatars/[id] — Update avatar
 * DELETE /api/v1/admin/video-production/avatars/[id] — Soft-delete avatar
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { ApiError } from "@/lib/utils/api-response";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gender: z.enum(["male", "female"]).optional(),
  tags: z.array(z.string()).optional(),
  isGlobal: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN");

    const { id } = await params;
    const body = await req.json();
    const input = updateSchema.parse(body);

    const existing = await prisma.avatar.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      throw new ApiError("Avatar not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.avatar.update({
      where: { id },
      data: input,
    });

    return success(updated);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "ORG_ADMIN", "SUPER_ADMIN");

    const { id } = await params;

    const existing = await prisma.avatar.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("Avatar not found", 404, "NOT_FOUND");
    }

    await prisma.avatar.update({
      where: { id },
      data: { isActive: false },
    });

    return success({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
