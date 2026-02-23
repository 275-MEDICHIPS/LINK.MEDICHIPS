import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const updateOrgSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { orgId } = await params;

    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, slug: true } },
        programs: { select: { id: true, name: true, startDate: true, endDate: true, country: true } },
        _count: { select: { memberships: true, courses: true } },
      },
    });

    return success(org);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { orgId } = await params;

    const body = await req.json();
    const data = updateOrgSchema.parse(body);

    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    return success(org);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
