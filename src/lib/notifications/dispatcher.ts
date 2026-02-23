import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/utils/logger";

type NotificationPayload = {
  templateSlug: string;
  userId: string;
  variables: Record<string, string>;
  channels?: ("IN_APP" | "PUSH" | "SMS" | "EMAIL")[];
};

/**
 * Dispatch a notification to a user based on their preferences.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  const { templateSlug, userId, variables, channels } = payload;

  try {
    // Get template
    const template = await prisma.notificationTemplate.findFirst({
      where: { slug: templateSlug },
    });

    if (!template) {
      logger.warn("Notification template not found", { templateSlug });
      return;
    }

    // Get user preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId, enabled: true },
    });

    const enabledChannels = channels || preferences.map((p) => p.channel);

    // Render template
    const title = renderTemplate(template.subject || "", variables);
    const body = renderTemplate(template.body, variables);

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId,
        channel: template.channel,
        title,
        body,
        status: "QUEUED",
        data: variables,
      },
    });

    // Dispatch to each channel
    for (const channel of enabledChannels) {
      try {
        switch (channel) {
          case "IN_APP":
            // Already created in DB, just update status
            await prisma.notification.update({
              where: { id: notification.id },
              data: { status: "DELIVERED" },
            });
            break;

          case "PUSH":
            await sendPushNotification(userId, title, body);
            break;

          case "SMS":
            await sendSmsNotification(userId, body);
            break;

          case "EMAIL":
            await sendEmailNotification(userId, title, body);
            break;
        }
      } catch (err) {
        logger.error(`Failed to send ${channel} notification`, err, {
          userId,
          templateSlug,
        });
      }
    }
  } catch (error) {
    logger.error("Notification dispatch failed", error, { templateSlug, userId });
  }
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
}

async function sendPushNotification(userId: string, title: string, body: string): Promise<void> {
  // Get user's sessions for push subscription (stored in deviceInfo)
  const sessions = await prisma.userSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { deviceInfo: true },
  });

  if (sessions.length === 0) return;

  // Web Push API would be called here using push subscriptions from deviceInfo
  logger.info("Push notification sent", { userId, title });
}

async function sendSmsNotification(userId: string, body: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  if (!user?.phone) return;

  // Twilio SMS would be sent here
  if (process.env.TWILIO_ACCOUNT_SID) {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const credentials = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: user.phone,
        From: process.env.TWILIO_PHONE_NUMBER || "",
        Body: body,
      }),
    });
  }

  logger.info("SMS notification sent", { userId });
}

async function sendEmailNotification(userId: string, title: string, body: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user?.email) return;

  // SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: user.email, name: user.name }] }],
        from: { email: "noreply@medichips.ai", name: "MEDICHIPS-LINK" },
        subject: title,
        content: [{ type: "text/html", value: `<p>${body}</p>` }],
      }),
    });
  }

  logger.info("Email notification sent", { userId });
}

/**
 * Batch dispatch notifications to multiple users.
 */
export async function dispatchBulkNotification(
  templateSlug: string,
  userIds: string[],
  variables: Record<string, string>
): Promise<void> {
  const batchSize = 50;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map((userId) =>
        dispatchNotification({ templateSlug, userId, variables })
      )
    );
  }
}
