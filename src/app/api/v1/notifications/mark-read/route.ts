import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAll: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const { notificationIds, markAll } = markReadSchema.parse(body);

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: payload.sub, status: { not: "READ" } },
        data: { status: "READ", readAt: new Date() },
      });
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: payload.sub,
        },
        data: { status: "READ", readAt: new Date() },
      });
    }

    return success({ message: "Notifications marked as read" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
