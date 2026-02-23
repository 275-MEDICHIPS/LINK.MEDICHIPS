import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, requireRole, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const bulkEnrollSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN");
    const { programId } = await params;

    const body = await req.json();
    const { userIds } = bulkEnrollSchema.parse(body);

    // Get program with its courses
    const program = await prisma.program.findUniqueOrThrow({
      where: { id: programId },
      include: { courses: true },
    });

    // Bulk enroll in program
    const enrollments = await prisma.programEnrollment.createMany({
      data: userIds.map((userId) => ({
        userId,
        programId,
      })),
      skipDuplicates: true,
    });

    // Also enroll in all program courses
    const courseEnrollments = [];
    for (const pc of program.courses) {
      const result = await prisma.courseEnrollment.createMany({
        data: userIds.map((userId) => ({
          userId,
          courseId: pc.courseId,
          progressPct: 0,
        })),
        skipDuplicates: true,
      });
      courseEnrollments.push({ courseId: pc.courseId, enrolled: result.count });
    }

    return success({
      programEnrolled: enrollments.count,
      courseEnrollments,
      totalUsers: userIds.length,
    }, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
