import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_LOCALE = "ko";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const orgId = payload.orgId;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: orgId,
      deletedAt: null,
      status: "PUBLISHED",
    };

    if (search) {
      where.translations = {
        some: {
          title: { contains: search, mode: "insensitive" },
        },
      };
    }

    if (category) {
      where.creator = { creatorField: category };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        translations: { where: { locale: DEFAULT_LOCALE } },
        specialtyTags: { include: { specialty: true } },
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            creatorTitle: true,
            creatorField: true,
          },
        },
        modules: {
          where: { deletedAt: null },
          include: {
            lessons: {
              where: { deletedAt: null },
              select: { id: true, contentType: true, durationMin: true },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get user's enrollments to add progress info
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true, progressPct: true },
    });
    const enrollmentMap = new Map(
      enrollments.map((e) => [e.courseId, e.progressPct])
    );

    const coursesData = courses.map((course) => {
      const t = course.translations[0];
      const videoCount = course.modules.reduce(
        (sum, m) =>
          sum +
          m.lessons.filter(
            (l) => l.contentType === "VIDEO" || l.contentType === "MIXED"
          ).length,
        0
      );
      const totalDurationMin = course.modules.reduce(
        (sum, m) =>
          sum + m.lessons.reduce((s, l) => s + (l.durationMin ?? 0), 0),
        0
      );

      return {
        id: course.id,
        slug: course.slug,
        riskLevel: course.riskLevel,
        thumbnailUrl: course.thumbnailUrl,
        estimatedHours: course.estimatedHours,
        title: t?.title ?? "Untitled",
        description: t?.description ?? null,
        moduleCount: course.modules.length,
        enrollmentCount: course._count.enrollments,
        videoCount,
        totalDurationMin,
        specialties: course.specialtyTags.map((st) => ({
          id: st.specialty.id,
          name: st.specialty.name,
        })),
        creator: course.creator
          ? {
              id: course.creator.id,
              name: course.creator.name,
              avatarUrl: course.creator.avatarUrl,
              creatorTitle: course.creator.creatorTitle,
              creatorField: course.creator.creatorField,
            }
          : null,
        progressPct: enrollmentMap.get(course.id) ?? null,
        isEnrolled: enrollmentMap.has(course.id),
      };
    });

    return success({
      courses: coursesData,
      total: coursesData.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
