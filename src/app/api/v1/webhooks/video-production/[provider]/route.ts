/**
 * POST /api/v1/webhooks/video-production/[provider]
 *
 * Webhook handler for video production providers.
 * No JWT auth — uses HMAC signature verification instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  downloadAndStoreOutput,
  ingestToMux,
} from "@/lib/services/video-production.service";
import crypto from "crypto";

const WEBHOOK_SECRETS: Record<string, string | undefined> = {
  veo: process.env.VEO_WEBHOOK_SECRET,
};

function verifySignature(
  provider: string,
  body: string,
  signature: string | null
): boolean {
  const secret = WEBHOOK_SECRETS[provider];
  if (!secret) {
    console.warn(`[webhook] No webhook secret configured for ${provider}`);
    return false;
  }
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const rawBody = await req.text();

    // Verify HMAC signature
    const signature =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("webhook-signature");

    if (!verifySignature(provider, rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    // Extract external job ID based on provider
    let externalJobId: string | undefined;
    let status: string | undefined;

    switch (provider) {
      case "veo":
        externalJobId = payload.name || payload.operationName;
        status = payload.done === true
          ? (payload.error ? "failed" : "completed")
          : "processing";
        break;
    }

    if (!externalJobId) {
      return NextResponse.json(
        { error: "Could not extract job ID from webhook payload" },
        { status: 400 }
      );
    }

    // Find the job
    const job = await prisma.videoProductionJob.findFirst({
      where: { externalJobId },
    });

    if (!job) {
      console.warn(`[webhook] No job found for externalJobId: ${externalJobId}`);
      return NextResponse.json({ received: true, matched: false });
    }

    // If completed, trigger download → GCS → Mux pipeline
    if (status === "completed" || status === "complete") {
      try {
        await downloadAndStoreOutput(job.id);
        await ingestToMux(job.id);
      } catch (error) {
        console.error(`[webhook] Pipeline error for job ${job.id}:`, error);
        await prisma.videoProductionJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorMessage:
              error instanceof Error
                ? error.message
                : "Post-processing failed",
          },
        });
      }
    } else if (status === "failed") {
      await prisma.videoProductionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: payload.error?.message || "Provider reported failure",
        },
      });

      await prisma.videoJobStatusHistory.create({
        data: {
          jobId: job.id,
          fromStatus: job.status,
          toStatus: "FAILED",
          triggeredBy: `webhook:${provider}`,
          metadata: { webhookPayload: payload },
        },
      });
    }

    return NextResponse.json({ received: true, jobId: job.id });
  } catch (error) {
    console.error("[webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
