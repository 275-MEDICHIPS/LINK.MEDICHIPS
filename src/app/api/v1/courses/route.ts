import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  handleAuthError,
} from "@/lib/auth/guards";
import {
  success,
  paginated,
  handleError,
} from "@/lib/utils/api-response";
import { AuthError } from "@/lib/auth/guards";
import {
  listCourses,
  createCourse,
} from "@/lib/services/course.service";

// ─── Schemas ─────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  locale: z.string().min(2).max(10).default("en"),
  status: z
    .enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"])
    .optional(),
  riskLevel: z.enum(["L1", "L2", "L3"]).optional(),
  specialtyId: z.string().optional(),
  search: z.string().optional(),
});

const createCourseSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens"
    ),
  riskLevel: z.enum(["L1", "L2", "L3"]).optional(),
  thumbnailUrl: z.string().url().optional(),
  estimatedHours: z.number().positive().optional(),
  locale: z.string().min(2).max(10),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  specialtyIds: z.array(z.string()).optional(),
});

// ─── GET /api/v1/courses ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const query = listQuerySchema.parse(params);

    const { courses, total, page, pageSize } = await listCourses(
      payload.orgId,
      query
    );

    return paginated(courses, total, page, pageSize);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}

// ─── POST /api/v1/courses ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    requireRole(payload, "SUPER_ADMIN", "ORG_ADMIN", "INSTRUCTOR");

    const body = await req.json();
    const data = createCourseSchema.parse(body);

    const course = await createCourse({
      organizationId: payload.orgId,
      ...data,
    });

    return success(course, 201);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
