import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_LOCALE = "ko";

export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      where: {
        deletedAt: null,
        status: "PUBLISHED",
      },
      include: {
        translations: { where: { locale: DEFAULT_LOCALE } },
        creator: {
          select: {
            name: true,
            creatorTitle: true,
          },
        },
        modules: {
          where: { deletedAt: null },
          include: {
            lessons: {
              where: { deletedAt: null },
              select: { id: true, contentType: true },
            },
          },
        },
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

      return {
        id: course.id,
        slug: course.slug,
        title: t?.title ?? "Untitled",
        description: t?.description ?? null,
        thumbnailUrl: course.thumbnailUrl,
        riskLevel: course.riskLevel,
        estimatedHours: course.estimatedHours,
        moduleCount: course.modules.length,
        videoCount,
        creator: course.creator
          ? { name: course.creator.name, creatorTitle: course.creator.creatorTitle }
          : null,
      };
    });

    return success({ courses: coursesData });
  } catch (error) {
    return handleError(error);
  }
}
