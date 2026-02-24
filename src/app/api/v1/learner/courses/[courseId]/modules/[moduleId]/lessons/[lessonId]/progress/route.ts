import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  updateLessonProgress,
  updateCourseEnrollmentProgress,
} from "@/lib/services/progress.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }
) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;
    const { courseId, lessonId } = await params;

    const body = await req.json();

    const progress = await updateLessonProgress(userId, lessonId, {
      status: body.status,
      timeSpentSec: body.timeSpentSec,
      lastPosition: body.lastPosition,
    });

    // Update course enrollment progress
    try {
      await updateCourseEnrollmentProgress(userId, courseId);
    } catch {
      // Enrollment might not exist yet — not critical
    }

    return success({
      status: progress.status,
      score: progress.score,
      timeSpentSec: progress.timeSpentSec,
      lastPosition: progress.lastPosition,
    });
  } catch (error) {
    return handleError(error);
  }
}
