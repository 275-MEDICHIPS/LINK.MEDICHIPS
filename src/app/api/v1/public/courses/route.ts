import { NextRequest } from "next/server";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_LOCALE = "ko";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const specialtyId = searchParams.get("specialtyId") || undefined;

    const where: Record<string, unknown> = {
      deletedAt: null,
      status: "PUBLISHED",
    };

    if (search) {
      where.translations = {
        some: { title: { contains: search, mode: "insensitive" } },
      };
    }

    if (specialtyId) {
      where.specialtyTags = {
        some: { specialtyId },
      };
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
        progressPct: null,
        isEnrolled: false,
      };
    });

    return success({ courses: coursesData, total: coursesData.length });
  } catch (error) {
    return handleError(error);
  }
}
