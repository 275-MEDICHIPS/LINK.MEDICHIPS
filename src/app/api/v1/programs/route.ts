import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, paginated, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const createProgramSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  country: z.string().length(2),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const orgId = url.searchParams.get("organizationId");

    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (payload.role !== "SUPER_ADMIN") {
      where.organizationId = payload.orgId;
    }

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, courses: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: "desc" },
      }),
      prisma.program.count({ where }),
    ]);

    return paginated(programs, total, page, limit);
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
    const data = createProgramSchema.parse(body);

    const program = await prisma.program.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId: data.organizationId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        country: data.country,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });

    return success(program, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
