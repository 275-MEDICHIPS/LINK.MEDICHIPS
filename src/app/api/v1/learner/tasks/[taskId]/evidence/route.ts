import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { submitTaskEvidence } from "@/lib/services/task.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    authenticate(req);
    const { taskId } = await params;

    const body = await req.json();

    const evidence = await submitTaskEvidence(taskId, {
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      gpsLat: body.gpsLat,
      gpsLng: body.gpsLng,
      metadata: body.metadata,
    });

    return success({
      id: evidence.id,
      fileUrl: evidence.fileUrl,
      fileType: evidence.fileType,
      createdAt: evidence.createdAt.toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}
