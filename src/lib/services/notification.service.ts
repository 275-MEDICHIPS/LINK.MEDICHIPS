import { prisma } from "@/lib/db/prisma";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache/redis";
import type { NotificationChannel, NotificationStatus, Prisma } from "@prisma/client";

// ==================== CACHE KEYS ====================

const NOTIFICATION_CACHE = {
  unreadCount: (userId: string) => `notif:unread:${userId}`,
  preferences: (userId: string) => `notif:prefs:${userId}`,
} as const;

// ==================== SEND NOTIFICATIONS ====================

/**
 * Send a notification to a single user on a specific channel.
 * Respects quiet hours and user preferences.
 */
export async function sendNotification(
  userId: string,
  channel: NotificationChannel,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  // Check user preference for this channel
  const pref = await getUserPreferenceForChannel(userId, channel);
  if (pref && !pref.enabled) {
    return null; // User has disabled this channel
  }

  // Check quiet hours
  if (await isQuietHours(userId, channel)) {
    // Queue for later delivery instead of sending now
    return queueNotification(userId, channel, title, body, undefined, data);
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      channel,
      status: "SENT",
      title,
      body,
      data: (data as Prisma.InputJsonValue) ?? undefined,
      sentAt: new Date(),
    },
  });

  // Invalidate unread count cache
  await cacheDelete(NOTIFICATION_CACHE.unreadCount(userId));

  // Dispatch to channel-specific sender
  await dispatchToChannel(channel, userId, title, body, data);

  return notification;
}

/**
 * Send a notification to multiple users.
 */
export async function sendBulkNotification(
  userIds: string[],
  channel: NotificationChannel,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      sendNotification(userId, channel, title, body, data)
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { sent, failed, total: userIds.length };
}

/**
 * Queue a notification for later delivery.
 */
export async function queueNotification(
  userId: string,
  channel: NotificationChannel,
  title: string,
  body: string,
  scheduledFor?: Date,
  data?: Record<string, unknown>
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      channel,
      status: "QUEUED",
      title,
      body,
      data: (data as Prisma.InputJsonValue) ?? undefined,
      scheduledFor: scheduledFor ?? null,
    },
  });

  await cacheDelete(NOTIFICATION_CACHE.unreadCount(userId));

  return notification;
}

// ==================== READ / LIST ====================

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    return null;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  await cacheDelete(NOTIFICATION_CACHE.unreadCount(userId));

  return updated;
}

/**
 * Mark multiple notifications as read.
 */
export async function markManyAsRead(notificationIds: string[], userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
      status: { not: "READ" },
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  await cacheDelete(NOTIFICATION_CACHE.unreadCount(userId));

  return result;
}

/**
 * Get notifications for a user with optional filtering.
 */
export async function getNotifications(
  userId: string,
  status?: NotificationStatus,
  limit = 50
) {
  const where: Record<string, unknown> = { userId };
  if (status) {
    where.status = status;
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get unread notification count, cached.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const cacheKey = NOTIFICATION_CACHE.unreadCount(userId);
  const cached = await cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  const count = await prisma.notification.count({
    where: {
      userId,
      status: { in: ["QUEUED", "SENT", "DELIVERED"] },
      readAt: null,
    },
  });

  await cacheSet(cacheKey, count, 120); // 2 min cache
  return count;
}

// ==================== PREFERENCES ====================

/**
 * Get all notification preferences for a user.
 */
export async function getUserPreferences(userId: string) {
  const cacheKey = NOTIFICATION_CACHE.preferences(userId);
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchPreferences>>>(cacheKey);
  if (cached) return cached;

  const prefs = await fetchPreferences(userId);
  await cacheSet(cacheKey, prefs, 300);
  return prefs;
}

async function fetchPreferences(userId: string) {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  // Return all channels with defaults
  const channels: NotificationChannel[] = ["IN_APP", "PUSH", "SMS", "EMAIL"];
  return channels.map((channel) => {
    const existing = prefs.find((p) => p.channel === channel);
    return {
      channel,
      enabled: existing?.enabled ?? true,
      quietStart: existing?.quietStart ?? null,
      quietEnd: existing?.quietEnd ?? null,
    };
  });
}

/**
 * Get preference for a specific channel.
 */
async function getUserPreferenceForChannel(
  userId: string,
  channel: NotificationChannel
) {
  return prisma.notificationPreference.findUnique({
    where: { userId_channel: { userId, channel } },
  });
}

/**
 * Update notification preference for a channel.
 */
export async function updatePreference(
  userId: string,
  channel: NotificationChannel,
  enabled: boolean,
  quietStart?: string,
  quietEnd?: string
) {
  const pref = await prisma.notificationPreference.upsert({
    where: { userId_channel: { userId, channel } },
    create: {
      userId,
      channel,
      enabled,
      quietStart: quietStart ?? null,
      quietEnd: quietEnd ?? null,
    },
    update: {
      enabled,
      quietStart: quietStart ?? null,
      quietEnd: quietEnd ?? null,
    },
  });

  await cacheDelete(NOTIFICATION_CACHE.preferences(userId));

  return pref;
}

// ==================== QUIET HOURS ====================

/**
 * Check if current time is within a user's quiet hours for a channel.
 * IN_APP notifications are never blocked by quiet hours.
 */
export async function isQuietHours(
  userId: string,
  channel: NotificationChannel
): Promise<boolean> {
  if (channel === "IN_APP") return false;

  const pref = await getUserPreferenceForChannel(userId, channel);
  if (!pref?.quietStart || !pref?.quietEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = pref.quietStart.split(":").map(Number);
  const [endH, endM] = pref.quietEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ==================== EVENT TRIGGER MAPPING ====================

type EventType =
  | "LESSON_COMPLETE"
  | "QUIZ_PASS"
  | "BADGE_EARNED"
  | "INACTIVE_3_DAYS"
  | "STREAK_WARNING"
  | "TASK_ASSIGNED"
  | "TASK_SUBMITTED"
  | "CONTENT_REVIEW_REQUESTED"
  | "CERTIFICATE_ISSUED"
  | "PROGRAM_MONTHLY_REPORT";

interface EventPayload {
  userId?: string;
  targetUserId?: string;
  targetUserIds?: string[];
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  // Context-specific fields
  badgeName?: string;
  courseName?: string;
  taskTitle?: string;
  contentTitle?: string;
  reviewerId?: string;
  programName?: string;
  reportUrl?: string;
  orgAdminIds?: string[];
}

interface NotificationTarget {
  channels: NotificationChannel[];
  getUserIds: (payload: EventPayload) => string[];
  getTitle: (payload: EventPayload) => string;
  getBody: (payload: EventPayload) => string;
}

const EVENT_MAP: Record<EventType, NotificationTarget> = {
  LESSON_COMPLETE: {
    channels: ["IN_APP"],
    getUserIds: (p) => [p.userId!],
    getTitle: () => "Lesson Completed",
    getBody: (p) => p.body ?? "Great job completing the lesson!",
  },
  QUIZ_PASS: {
    channels: ["IN_APP", "PUSH"],
    getUserIds: (p) => [p.userId!],
    getTitle: () => "Quiz Passed",
    getBody: (p) => p.body ?? "Congratulations! You passed the quiz.",
  },
  BADGE_EARNED: {
    channels: ["IN_APP", "PUSH"],
    getUserIds: (p) => [p.userId!],
    getTitle: () => "Badge Earned",
    getBody: (p) => `You earned the "${p.badgeName ?? "new"}" badge!`,
  },
  INACTIVE_3_DAYS: {
    channels: ["PUSH", "SMS"],
    getUserIds: (p) => [p.userId!],
    getTitle: () => "We miss you!",
    getBody: () =>
      "You haven't been active for 3 days. Continue learning to keep your streak!",
  },
  STREAK_WARNING: {
    channels: ["PUSH"],
    getUserIds: (p) => [p.userId!],
    getTitle: () => "Streak at Risk",
    getBody: () =>
      "Complete a lesson today to maintain your streak!",
  },
  TASK_ASSIGNED: {
    channels: ["PUSH", "SMS"],
    getUserIds: (p) => [p.targetUserId!],
    getTitle: () => "New Task Assigned",
    getBody: (p) =>
      `You have a new task: "${p.taskTitle ?? "Check your tasks"}"`,
  },
  TASK_SUBMITTED: {
    channels: ["IN_APP", "PUSH"],
    getUserIds: (p) => [p.targetUserId!],
    getTitle: () => "Task Submitted for Review",
    getBody: (p) =>
      `A learner submitted "${p.taskTitle ?? "a task"}" for your review.`,
  },
  CONTENT_REVIEW_REQUESTED: {
    channels: ["EMAIL", "IN_APP"],
    getUserIds: (p) => [p.reviewerId!],
    getTitle: () => "Content Review Requested",
    getBody: (p) =>
      `"${p.contentTitle ?? "Content"}" needs your review.`,
  },
  CERTIFICATE_ISSUED: {
    channels: ["EMAIL", "PUSH"],
    getUserIds: (p) => [p.userId!],
    getTitle: () => "Certificate Issued",
    getBody: (p) =>
      `Your certificate for "${p.courseName ?? "the course"}" has been issued!`,
  },
  PROGRAM_MONTHLY_REPORT: {
    channels: ["EMAIL"],
    getUserIds: (p) => p.orgAdminIds ?? [],
    getTitle: (p) => `Monthly Report: ${p.programName ?? "Program"}`,
    getBody: (p) =>
      p.body ?? "Your monthly program report is ready for review.",
  },
};

/**
 * Trigger a notification event. Maps event types to notification channels
 * and target users.
 */
export async function triggerEvent(
  eventType: EventType,
  payload: EventPayload
) {
  const mapping = EVENT_MAP[eventType];
  if (!mapping) {
    console.warn(`Unknown notification event type: ${eventType}`);
    return [];
  }

  const userIds = mapping.getUserIds(payload);
  const title = payload.title ?? mapping.getTitle(payload);
  const body = mapping.getBody(payload);
  const data = {
    ...payload.data,
    eventType,
  };

  const results = [];

  for (const channel of mapping.channels) {
    for (const userId of userIds) {
      try {
        const notif = await sendNotification(
          userId,
          channel,
          title,
          body,
          data
        );
        results.push({ userId, channel, success: true, notificationId: notif?.id });
      } catch (error) {
        console.error(
          `Failed to send ${channel} notification to ${userId}:`,
          error
        );
        results.push({ userId, channel, success: false, error: String(error) });
      }
    }
  }

  return results;
}

// ==================== CHANNEL DISPATCH (STUBS) ====================

/**
 * Dispatch notification to the appropriate channel handler.
 * Actual implementations will be added for PUSH (web-push), SMS (Twilio), EMAIL (SendGrid).
 */
async function dispatchToChannel(
  channel: NotificationChannel,
  userId: string,
  title: string,
  body: string,
  _data?: Record<string, unknown>
) {
  switch (channel) {
    case "IN_APP":
      // Already stored in DB, no extra dispatch needed
      break;
    case "PUSH":
      // TODO: Implement web-push with VAPID keys
      // await sendWebPush(userId, { title, body, data });
      break;
    case "SMS":
      // TODO: Implement SMS via Twilio or similar
      // await sendSms(userId, body);
      break;
    case "EMAIL":
      // TODO: Implement email via SendGrid or similar
      // await sendEmail(userId, title, body);
      break;
    default:
      console.warn(`Unknown notification channel: ${channel}`);
  }
}

// ==================== PUSH SUBSCRIPTION ====================

/**
 * Save a VAPID push subscription for a user.
 * Stored in user session or a dedicated table as needed.
 */
export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
) {
  // Store subscription in user metadata via a notification preference update
  // In production, this would go to a dedicated PushSubscription table
  // For now, store in Redis keyed by user
  const key = `push:sub:${userId}`;
  await cacheSet(key, subscription, 30 * 24 * 60 * 60); // 30 days
  return { success: true };
}

/**
 * Get stored push subscription for a user.
 */
export async function getPushSubscription(userId: string) {
  const key = `push:sub:${userId}`;
  return cacheGet<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }>(key);
}
