import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const payload = authenticate(req);
    const { programId } = await params;

    const program = await prisma.program.findUniqueOrThrow({
      where: { id: programId },
      include: {
        organization: { select: { id: true, name: true } },
        courses: {
          include: { course: { include: { translations: { where: { locale: "en" } } } } },
        },
        enrollments: {
          include: { user: { select: { id: true, name: true } } },
          take: 50,
        },
        _count: { select: { enrollments: true, courses: true } },
      },
    });

    return success(program);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

const updateProgramSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  endDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { programId } = await params;

    const body = await req.json();
    const data = updateProgramSchema.parse(body);

    const program = await prisma.program.update({
      where: { id: programId },
      data: {
        name: data.name,
        description: data.description,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });

    return success(program);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
