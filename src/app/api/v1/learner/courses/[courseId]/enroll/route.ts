import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const { courseId } = await params;

    // Verify course exists and is published
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isPublished: true },
    });

    if (!course) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }

    // Upsert enrollment (idempotent)
    const enrollment = await prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        progressPct: 0,
      },
      update: {},
    });

    return success({
      id: enrollment.id,
      courseId: enrollment.courseId,
      enrolledAt: enrollment.enrolledAt.toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}
