/**
 * HeyGen API provider — AI avatar video generation.
 *
 * API docs: https://docs.heygen.com/reference
 * Pricing: ~$4/min of generated video
 */

import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  ProviderJobResult,
  ProviderJobStatus,
} from "./types";

const API_BASE = "https://api.heygen.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const COST_PER_MINUTE_USD = 4;

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY is not set");
  return key;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": getApiKey(),
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[heygen] Retryable ${res.status}, attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      return res;
    } catch (err) {
      if (err instanceof TypeError && attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoff);
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error("HeyGen API call failed after retries");
}

export class HeyGenProvider implements VideoGenerationProvider {
  readonly name = "HEYGEN";

  async createVideo(params: VideoGenerationParams): Promise<ProviderJobResult> {
    const body = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: params.avatarId || "Daisy-inskirt-20220818",
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: params.script,
            voice_id: params.voiceId || "en-US-JennyNeural",
            ...(params.language && { language: params.language }),
          },
          background: {
            type: "color",
            value: params.background || "#FFFFFF",
          },
        },
      ],
      dimension: params.aspectRatio === "9:16"
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 },
      test: process.env.NODE_ENV !== "production",
    };

    const res = await fetchWithRetry(`${API_BASE}/v2/video/generate`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`HeyGen video creation failed (${res.status}): ${error}`);
    }

    const data = await res.json();
    return { externalJobId: data.data?.video_id || data.data?.id };
  }

  async getJobStatus(externalJobId: string): Promise<ProviderJobStatus> {
    const res = await fetchWithRetry(
      `${API_BASE}/v1/video_status.get?video_id=${externalJobId}`,
      { method: "GET", headers: headers() }
    );

    if (!res.ok) {
      throw new Error(`HeyGen status check failed (${res.status})`);
    }

    const data = await res.json();
    const videoData = data.data;

    const statusMap: Record<string, ProviderJobStatus["status"]> = {
      pending: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
    };

    return {
      status: statusMap[videoData?.status] || "pending",
      progress: videoData?.status === "completed" ? 100 : undefined,
      downloadUrl: videoData?.video_url || undefined,
      errorMessage: videoData?.error || undefined,
    };
  }

  async getDownloadUrl(externalJobId: string): Promise<string> {
    const status = await this.getJobStatus(externalJobId);
    if (!status.downloadUrl) {
      throw new Error("Video not ready for download");
    }
    return status.downloadUrl;
  }

  estimateCost(durationSec: number): number {
    return Math.ceil(durationSec / 60) * COST_PER_MINUTE_USD;
  }
}
