import { NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError, ApiError } from "@/lib/utils/api-response";

const createInviteSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  role: z.enum([
    "LEARNER",
    "MENTOR",
    "SUPERVISOR",
    "INSTRUCTOR",
    "ORG_ADMIN",
  ]).default("LEARNER"),
  expiresIn: z
    .number()
    .min(1)
    .max(365)
    .default(7)
    .describe("Expiration in days"),
  maxUses: z.number().min(1).max(1000).default(1),
});

/**
 * POST: Create a new invite code (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "ORG_ADMIN", "SUPER_ADMIN");

    const body = await req.json();
    const input = createInviteSchema.parse(body);

    // Verify the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: input.organizationId },
    });
    if (!organization) {
      throw new ApiError(
        "Organization not found",
        404,
        "ORG_NOT_FOUND"
      );
    }

    // For ORG_ADMIN, verify they belong to this organization
    if (payload.role === "ORG_ADMIN" && payload.orgId !== input.organizationId) {
      throw new ApiError(
        "Cannot create invites for other organizations",
        403,
        "ORG_MISMATCH"
      );
    }

    // Generate a unique invite code (12 chars, URL-safe)
    const code = nanoid(12);

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        organizationId: input.organizationId,
        role: input.role,
        createdBy: payload.sub,
        maxUses: input.maxUses,
        expiresAt: new Date(
          Date.now() + input.expiresIn * 24 * 60 * 60 * 1000
        ),
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return success(
      {
        id: invite.id,
        code: invite.code,
        role: invite.role,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt.toISOString(),
        organization: invite.organization,
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${invite.code}`,
      },
      201
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AuthError"
    ) {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * GET: Validate an invite code and return organization info
 * Query param: ?code=XXXXXX
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      throw new ApiError(
        "Invite code is required",
        400,
        "CODE_REQUIRED"
      );
    }

    const invite = await prisma.inviteCode.findUnique({
      where: { code },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
      },
    });

    if (!invite) {
      throw new ApiError(
        "Invalid invite code",
        404,
        "INVITE_NOT_FOUND"
      );
    }

    if (invite.expiresAt < new Date()) {
      throw new ApiError(
        "This invite code has expired",
        410,
        "INVITE_EXPIRED"
      );
    }

    if (invite.useCount >= invite.maxUses) {
      throw new ApiError(
        "This invite code has been fully used",
        410,
        "INVITE_EXHAUSTED"
      );
    }

    return success({
      valid: true,
      role: invite.role,
      organization: invite.organization,
    });
  } catch (error) {
    return handleError(error);
  }
}
