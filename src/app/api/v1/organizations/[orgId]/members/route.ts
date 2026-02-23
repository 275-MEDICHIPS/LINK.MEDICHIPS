import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["ORG_ADMIN", "INSTRUCTOR", "SUPERVISOR", "LEARNER"]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { orgId } = await params;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const role = url.searchParams.get("role");
    const search = url.searchParams.get("search") || "";

    const where: Record<string, unknown> = { organizationId: orgId };
    if (role) where.role = role;
    if (search) {
      where.user = { name: { contains: search, mode: "insensitive" } };
    }

    const [members, total] = await Promise.all([
      prisma.organizationMembership.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, isActive: true, lastActiveAt: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.organizationMembership.count({ where }),
    ]);

    return paginated(members, total, page, limit);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { orgId } = await params;

    const body = await req.json();
    const { userId, role } = addMemberSchema.parse(body);

    const membership = await prisma.organizationMembership.create({
      data: { userId, organizationId: orgId, role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return success(membership, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
