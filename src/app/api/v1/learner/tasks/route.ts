import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { getMyTasks } from "@/lib/services/task.service";

const DEFAULT_LOCALE = "en";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const userId = payload.sub;

    const result = await getMyTasks(userId);

    const tasks = result.tasks.map((task) => {
      const lessonTitle = task.lesson?.translations?.find(
        (t) => t.locale === DEFAULT_LOCALE
      )?.title ?? task.lesson?.translations?.[0]?.title ?? null;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        riskLevel: null,
        checklist: task.checklist
          ? (task.checklist as Array<{ label?: string; text?: string; done: boolean }>).map(
              (item) => ({ label: item.label ?? item.text ?? "", done: item.done })
            )
          : null,
        dueDate: task.dueDate?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        evidence: task.evidence.map((e) => ({
          id: e.id,
          fileUrl: e.fileUrl,
          fileType: e.fileType,
          createdAt: e.createdAt.toISOString(),
        })),
        lessonTitle,
        courseTitle: null,
        source: task.source,
        createdAt: task.createdAt.toISOString(),
      };
    });

    return success({
      tasks,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    return handleError(error);
  }
}
