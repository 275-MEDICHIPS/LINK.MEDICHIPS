import { NextRequest } from "next/server";
import {
  authenticate,
  handleAuthError,
  AuthError,
} from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getCourseLessonsForVideo } from "@/lib/services/course-video.service";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    authenticate(req);
    const { courseId } = await context.params;
    const locale = req.nextUrl.searchParams.get("locale") ?? "en";

    const lessons = await getCourseLessonsForVideo(courseId, locale);
    return success(lessons);
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return handleError(error);
  }
}
