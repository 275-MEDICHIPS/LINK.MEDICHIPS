import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import {
  savePushSubscription,
  getUserPreferences,
  updatePreference,
} from "@/lib/services/notification.service";
import type { NotificationChannel } from "@prisma/client";

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const updatePreferenceSchema = z.object({
  channel: z.enum(["IN_APP", "PUSH", "SMS", "EMAIL"]),
  enabled: z.boolean(),
  quietStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format: HH:MM")
    .optional(),
  quietEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Format: HH:MM")
    .optional(),
});

/**
 * POST /api/v1/notifications/subscribe
 * Subscribe to push notifications (save VAPID subscription).
 */
export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const subscription = pushSubscriptionSchema.parse(body);

    const result = await savePushSubscription(payload.sub, subscription);

    return success(result, 201);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * GET /api/v1/notifications/subscribe
 * Get notification preferences for all channels.
 */
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const preferences = await getUserPreferences(payload.sub);

    return success({ preferences });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}

/**
 * PATCH /api/v1/notifications/subscribe
 * Update notification preferences for a specific channel.
 */
export async function PATCH(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const input = updatePreferenceSchema.parse(body);

    const preference = await updatePreference(
      payload.sub,
      input.channel as NotificationChannel,
      input.enabled,
      input.quietStart,
      input.quietEnd
    );

    return success(preference);
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") {
      return handleAuthError(error);
    }
    return handleError(error);
  }
}
