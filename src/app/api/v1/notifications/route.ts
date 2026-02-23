import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markManyAsRead,
} from "@/lib/services/notification.service";
import type { NotificationStatus } from "@prisma/client";

const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * GET /api/v1/notifications
 * List notifications for the current user.
 * Query params: status (QUEUED|SENT|DELIVERED|READ|FAILED), limit (default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as NotificationStatus | null;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
      200
    );

    const validStatuses: NotificationStatus[] = [
      "QUEUED",
      "SENT",
      "DELIVERED",
      "READ",
      "FAILED",
    ];
    const status =
      statusParam && validStatuses.includes(statusParam)
        ? statusParam
        : undefined;

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(payload.sub, status, limit),
      getUnreadCount(payload.sub),
    ]);

    return success({
      notifications,
      unreadCount,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * PATCH /api/v1/notifications
 * Mark one or more notifications as read.
 * Body: { notificationIds: string[] }
 */
export async function PATCH(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const input = markReadSchema.parse(body);

    if (input.notificationIds.length === 1) {
      const result = await markAsRead(input.notificationIds[0], payload.sub);
      return success({
        updated: result ? 1 : 0,
      });
    }

    const result = await markManyAsRead(input.notificationIds, payload.sub);

    return success({
      updated: result.count,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
