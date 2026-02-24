import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { listCourses } from "@/lib/services/course.service";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_LOCALE = "en";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const orgId = payload.orgId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;

    const result = await listCourses(orgId, {
      status: "PUBLISHED",
      search,
      locale: DEFAULT_LOCALE,
    });

    // Get user's enrollments to add progress info
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true, progressPct: true },
    });
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.courseId, e.progressPct])
    );

    const courses = result.courses.map((course) => {
      const t = course.translations[0];
      return {
        id: course.id,
        slug: course.slug,
        riskLevel: course.riskLevel,
        thumbnailUrl: course.thumbnailUrl,
        estimatedHours: course.estimatedHours,
        title: t?.title ?? "Untitled",
        description: t?.description ?? null,
        moduleCount: course._count.modules,
        enrollmentCount: course._count.enrollments,
        specialties: course.specialtyTags.map((st) => ({
          id: st.specialty.id,
          name: st.specialty.name,
        })),
        progressPct: enrollmentMap.get(course.id) ?? null,
        isEnrolled: enrollmentMap.has(course.id),
      };
    });

    return success({
      courses,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    return handleError(error);
  }
}
