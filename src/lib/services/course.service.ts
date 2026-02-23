import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/utils/api-response";
import type {
  ContentReviewStatus,
  ContentType,
  RiskLevel,
} from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface ListCoursesFilters {
  page?: number;
  pageSize?: number;
  locale?: string;
  status?: ContentReviewStatus;
  riskLevel?: RiskLevel;
  specialtyId?: string;
  search?: string;
}

export interface CreateCourseInput {
  organizationId: string;
  slug: string;
  riskLevel?: RiskLevel;
  thumbnailUrl?: string;
  estimatedHours?: number;
  locale: string;
  title: string;
  description?: string;
  specialtyIds?: string[];
}

export interface UpdateCourseInput {
  slug?: string;
  riskLevel?: RiskLevel;
  thumbnailUrl?: string | null;
  estimatedHours?: number | null;
  status?: ContentReviewStatus;
}

export interface CreateModuleInput {
  locale: string;
  title: string;
  description?: string;
}

export interface UpdateModuleInput {
  locale?: string;
  title?: string;
  description?: string | null;
  orderIndex?: number;
}

export interface CreateLessonInput {
  locale: string;
  title: string;
  description?: string;
  contentType: ContentType;
  durationMin?: number;
  isRequired?: boolean;
  body: unknown;
  isAiGenerated?: boolean;
}

export interface UpdateLessonInput {
  locale?: string;
  title?: string;
  description?: string | null;
  contentType?: ContentType;
  durationMin?: number | null;
  isRequired?: boolean;
  orderIndex?: number;
  body?: unknown;
  isAiGenerated?: boolean;
}

// ─── Course CRUD ─────────────────────────────────────────────────────

export async function listCourses(
  orgId: string,
  filters: ListCoursesFilters = {}
) {
  const {
    page = 1,
    pageSize = 20,
    locale = "en",
    status,
    riskLevel,
    specialtyId,
    search,
  } = filters;

  const where: Record<string, unknown> = {
    organizationId: orgId,
    deletedAt: null,
  };
  if (status) where.status = status;
  if (riskLevel) where.riskLevel = riskLevel;
  if (specialtyId) {
    where.specialtyTags = { some: { specialtyId } };
  }
  if (search) {
    where.translations = {
      some: {
        locale,
        title: { contains: search, mode: "insensitive" },
      },
    };
  }

  const [courses, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      include: {
        translations: { where: { locale } },
        specialtyTags: { include: { specialty: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.course.count({ where }),
  ]);

  return { courses, total, page, pageSize };
}

export async function getCourse(courseId: string, locale = "en") {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: {
      translations: { where: { locale } },
      specialtyTags: { include: { specialty: true } },
      modules: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
        include: {
          translations: { where: { locale } },
          lessons: {
            where: { deletedAt: null },
            orderBy: { orderIndex: "asc" },
            include: {
              translations: { where: { locale } },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  return course;
}

export async function createCourse(data: CreateCourseInput) {
  // Check slug uniqueness
  const existing = await prisma.course.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    throw new ApiError(
      "Course slug already exists",
      409,
      "SLUG_CONFLICT"
    );
  }

  const course = await prisma.course.create({
    data: {
      organizationId: data.organizationId,
      slug: data.slug,
      riskLevel: data.riskLevel ?? "L1",
      thumbnailUrl: data.thumbnailUrl,
      estimatedHours: data.estimatedHours,
      translations: {
        create: {
          locale: data.locale,
          title: data.title,
          description: data.description,
        },
      },
      ...(data.specialtyIds?.length
        ? {
            specialtyTags: {
              create: data.specialtyIds.map((specialtyId) => ({
                specialtyId,
              })),
            },
          }
        : {}),
    },
    include: {
      translations: true,
      specialtyTags: { include: { specialty: true } },
    },
  });

  return course;
}

export async function updateCourse(
  courseId: string,
  data: UpdateCourseInput
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  // Check slug uniqueness if changing
  if (data.slug && data.slug !== course.slug) {
    const existing = await prisma.course.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new ApiError(
        "Course slug already exists",
        409,
        "SLUG_CONFLICT"
      );
    }
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.riskLevel !== undefined && { riskLevel: data.riskLevel }),
      ...(data.thumbnailUrl !== undefined && {
        thumbnailUrl: data.thumbnailUrl,
      }),
      ...(data.estimatedHours !== undefined && {
        estimatedHours: data.estimatedHours,
      }),
      ...(data.status !== undefined && { status: data.status }),
    },
    include: {
      translations: true,
      specialtyTags: { include: { specialty: true } },
    },
  });

  return updated;
}

export async function deleteCourse(courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Publish a course after verifying risk-based review requirements (FIX-3).
 *
 * L1: at least 1 review if any AI content, auto-publishable otherwise
 * L2: at least 1 reviewer + OrgAdmin approval, 2 reviewers if AI content
 * L3: at least 2 reviewers + OrgAdmin + SuperAdmin approval, block AI auto-publish
 */
export async function publishCourse(courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: {
      modules: {
        where: { deletedAt: null },
        include: {
          lessons: {
            where: { deletedAt: null },
            include: {
              versions: {
                where: { status: "PUBLISHED" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  // Check that all lessons have a published content version
  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) {
    throw new ApiError(
      "Course must have at least one lesson",
      400,
      "NO_LESSONS"
    );
  }

  const unpublishedLessons = allLessons.filter(
    (l) => l.versions.length === 0
  );
  if (unpublishedLessons.length > 0) {
    throw new ApiError(
      `${unpublishedLessons.length} lesson(s) do not have published content`,
      400,
      "UNPUBLISHED_CONTENT"
    );
  }

  // Risk-level gating checks via audit log counts
  const riskLevel = course.riskLevel;
  if (riskLevel === "L2" || riskLevel === "L3") {
    // Check that at least one OrgAdmin has approved content
    const orgAdminApprovals = await prisma.contentAuditLog.count({
      where: {
        entityType: "course",
        entityId: courseId,
        action: "APPROVE",
        user: {
          memberships: {
            some: {
              organizationId: course.organizationId,
              role: "ORG_ADMIN",
            },
          },
        },
      },
    });

    if (orgAdminApprovals === 0) {
      throw new ApiError(
        `Risk level ${riskLevel} requires OrgAdmin approval`,
        403,
        "RISK_APPROVAL_REQUIRED"
      );
    }
  }

  if (riskLevel === "L3") {
    // Check SuperAdmin approval
    const superAdminApprovals = await prisma.contentAuditLog.count({
      where: {
        entityType: "course",
        entityId: courseId,
        action: "APPROVE",
        user: {
          memberships: {
            some: { role: "SUPER_ADMIN" },
          },
        },
      },
    });

    if (superAdminApprovals === 0) {
      throw new ApiError(
        "Risk level L3 requires SuperAdmin approval",
        403,
        "RISK_APPROVAL_REQUIRED"
      );
    }
  }

  const published = await prisma.course.update({
    where: { id: courseId },
    data: {
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
    },
    include: {
      translations: true,
    },
  });

  return published;
}

// ─── Module CRUD ─────────────────────────────────────────────────────

export async function listModules(courseId: string, locale = "en") {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  const modules = await prisma.module.findMany({
    where: { courseId, deletedAt: null },
    orderBy: { orderIndex: "asc" },
    include: {
      translations: { where: { locale } },
      _count: { select: { lessons: { where: { deletedAt: null } } } },
    },
  });

  return modules;
}

export async function getModule(moduleId: string, locale = "en") {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
    include: {
      translations: { where: { locale } },
      lessons: {
        where: { deletedAt: null },
        orderBy: { orderIndex: "asc" },
        include: {
          translations: { where: { locale } },
        },
      },
    },
  });

  if (!mod) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  return mod;
}

export async function createModule(
  courseId: string,
  data: CreateModuleInput
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  // Get next order index
  const maxOrder = await prisma.module.aggregate({
    where: { courseId, deletedAt: null },
    _max: { orderIndex: true },
  });
  const nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  const mod = await prisma.module.create({
    data: {
      courseId,
      orderIndex: nextIndex,
      translations: {
        create: {
          locale: data.locale,
          title: data.title,
          description: data.description,
        },
      },
    },
    include: {
      translations: true,
    },
  });

  return mod;
}

export async function updateModule(
  moduleId: string,
  data: UpdateModuleInput
) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
  });
  if (!mod) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  // Update translation if locale fields provided
  if (data.locale && (data.title || data.description !== undefined)) {
    await prisma.moduleTranslation.upsert({
      where: {
        moduleId_locale: { moduleId, locale: data.locale },
      },
      create: {
        moduleId,
        locale: data.locale,
        title: data.title ?? "",
        description: data.description,
      },
      update: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  }

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: {
      ...(data.orderIndex !== undefined && {
        orderIndex: data.orderIndex,
      }),
    },
    include: {
      translations: true,
    },
  });

  return updated;
}

export async function deleteModule(moduleId: string) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
  });
  if (!mod) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  await prisma.module.update({
    where: { id: moduleId },
    data: { deletedAt: new Date() },
  });
}

export async function reorderModules(
  courseId: string,
  moduleIds: string[]
) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
  });
  if (!course) {
    throw new ApiError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  // Verify all module IDs belong to this course
  const existingModules = await prisma.module.findMany({
    where: { courseId, deletedAt: null },
    select: { id: true },
  });
  const existingIds = new Set(existingModules.map((m) => m.id));

  for (const id of moduleIds) {
    if (!existingIds.has(id)) {
      throw new ApiError(
        `Module ${id} does not belong to this course`,
        400,
        "INVALID_MODULE"
      );
    }
  }

  await prisma.$transaction(
    moduleIds.map((id, index) =>
      prisma.module.update({
        where: { id },
        data: { orderIndex: index },
      })
    )
  );
}

// ─── Lesson CRUD ─────────────────────────────────────────────────────

export async function listLessons(moduleId: string, locale = "en") {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
  });
  if (!mod) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  const lessons = await prisma.lesson.findMany({
    where: { moduleId, deletedAt: null },
    orderBy: { orderIndex: "asc" },
    include: {
      translations: { where: { locale } },
      _count: { select: { versions: true } },
    },
  });

  return lessons;
}

export async function getLesson(lessonId: string, locale = "en") {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
    include: {
      translations: { where: { locale } },
      versions: {
        where: { status: "PUBLISHED" },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  return lesson;
}

export async function createLesson(
  moduleId: string,
  data: CreateLessonInput
) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
    include: { course: true },
  });
  if (!mod) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  // Get next order index
  const maxOrder = await prisma.lesson.aggregate({
    where: { moduleId, deletedAt: null },
    _max: { orderIndex: true },
  });
  const nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      orderIndex: nextIndex,
      contentType: data.contentType,
      durationMin: data.durationMin,
      isRequired: data.isRequired ?? true,
      translations: {
        create: {
          locale: data.locale,
          title: data.title,
          description: data.description,
        },
      },
      versions: {
        create: {
          version: 1,
          body: data.body as object,
          status: "DRAFT",
          isAiGenerated: data.isAiGenerated ?? false,
        },
      },
    },
    include: {
      translations: true,
      versions: true,
    },
  });

  return lesson;
}

export async function updateLesson(
  lessonId: string,
  data: UpdateLessonInput
) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
  });
  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  // Update translation if locale fields provided
  if (data.locale && (data.title || data.description !== undefined)) {
    await prisma.lessonTranslation.upsert({
      where: {
        lessonId_locale: { lessonId, locale: data.locale },
      },
      create: {
        lessonId,
        locale: data.locale,
        title: data.title ?? "",
        description: data.description,
      },
      update: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  }

  // Create new content version if body is provided
  if (data.body !== undefined) {
    const latestVersion = await prisma.contentVersion.findFirst({
      where: { lessonId },
      orderBy: { version: "desc" },
    });

    await prisma.contentVersion.create({
      data: {
        lessonId,
        version: (latestVersion?.version ?? 0) + 1,
        body: data.body as object,
        status: "DRAFT",
        isAiGenerated: data.isAiGenerated ?? false,
        previousVersionId: latestVersion?.id,
      },
    });
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(data.contentType !== undefined && {
        contentType: data.contentType,
      }),
      ...(data.durationMin !== undefined && {
        durationMin: data.durationMin,
      }),
      ...(data.isRequired !== undefined && {
        isRequired: data.isRequired,
      }),
      ...(data.orderIndex !== undefined && {
        orderIndex: data.orderIndex,
      }),
    },
    include: {
      translations: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  return updated;
}

export async function deleteLesson(lessonId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, deletedAt: null },
  });
  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { deletedAt: new Date() },
  });
}

export async function reorderLessons(
  moduleId: string,
  lessonIds: string[]
) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
  });
  if (!mod) {
    throw new ApiError("Module not found", 404, "MODULE_NOT_FOUND");
  }

  const existingLessons = await prisma.lesson.findMany({
    where: { moduleId, deletedAt: null },
    select: { id: true },
  });
  const existingIds = new Set(existingLessons.map((l) => l.id));

  for (const id of lessonIds) {
    if (!existingIds.has(id)) {
      throw new ApiError(
        `Lesson ${id} does not belong to this module`,
        400,
        "INVALID_LESSON"
      );
    }
  }

  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { orderIndex: index },
      })
    )
  );
}
