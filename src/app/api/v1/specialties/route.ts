import { prisma } from "@/lib/db/prisma";
import { success, handleError } from "@/lib/utils/api-response";

export async function GET() {
  try {
    const specialties = await prisma.medicalSpecialty.findMany({
      include: {
        _count: { select: { courses: true } },
      },
      orderBy: { name: "asc" },
    });

    return success(
      specialties.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        iconUrl: s.iconUrl,
        courseCount: s._count.courses,
      }))
    );
  } catch (error) {
    return handleError(error);
  }
}
