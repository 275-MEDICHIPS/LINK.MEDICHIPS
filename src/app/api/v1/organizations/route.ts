import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const createOrgSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";

    const where: Record<string, unknown> = {};

    if (payload.role !== "SUPER_ADMIN") {
      where.id = payload.orgId;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } },
          _count: { select: { memberships: true, programs: true, courses: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.organization.count({ where }),
    ]);

    return paginated(orgs, total, page, limit);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");

    const body = await req.json();
    const data = createOrgSchema.parse(body);

    const org = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
      },
    });

    return success(org, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
