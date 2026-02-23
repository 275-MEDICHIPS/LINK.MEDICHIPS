import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate, handleAuthError } from "@/lib/auth/guards";
import { success, handleError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

const preferencesSchema = z.object({
  preferredLocale: z.string().min(2).max(5).optional(),
  connectivityLevel: z.enum(["HIGH", "MEDIUM", "LOW", "OFFLINE"]).optional(),
  notifications: z.object({
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    email: z.boolean().optional(),
    quietStart: z.string().optional(),
    quietEnd: z.string().optional(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      select: { preferredLocale: true, connectivityLevel: true },
    });

    const notifPrefs = await prisma.notificationPreference.findMany({
      where: { userId: payload.sub },
    });

    return success({ ...user, notifications: notifPrefs });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const body = await req.json();
    const data = preferencesSchema.parse(body);

    const updates: Record<string, unknown> = {};
    if (data.preferredLocale) updates.preferredLocale = data.preferredLocale;
    if (data.connectivityLevel) updates.connectivityLevel = data.connectivityLevel;

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: payload.sub },
        data: updates,
      });
    }

    if (data.notifications) {
      const channels = ["PUSH", "SMS", "EMAIL"] as const;
      for (const channel of channels) {
        const key = channel.toLowerCase() as "push" | "sms" | "email";
        if (data.notifications[key] !== undefined) {
          await prisma.notificationPreference.upsert({
            where: {
              userId_channel: { userId: payload.sub, channel },
            },
            update: { enabled: data.notifications[key]! },
            create: {
              userId: payload.sub,
              channel,
              enabled: data.notifications[key]!,
              quietStart: data.notifications.quietStart,
              quietEnd: data.notifications.quietEnd,
            },
          });
        }
      }
    }

    return success({ message: "Preferences updated" });
  } catch (error) {
    if (error instanceof Error && error.name === "AuthError") return handleAuthError(error);
    return handleError(error);
  }
}
