/**
 * Synthesia API provider — AI avatar video generation.
 *
 * API docs: https://docs.synthesia.io/reference
 * Pricing: ~$3/min of generated video
 */

import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  ProviderJobResult,
  ProviderJobStatus,
} from "./types";

const API_BASE = "https://api.synthesia.io/v2";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const COST_PER_MINUTE_USD = 3;

function getApiKey(): string {
  const key = process.env.SYNTHESIA_API_KEY;
  if (!key) throw new Error("SYNTHESIA_API_KEY is not set");
  return key;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: getApiKey(),
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
        console.warn(`[synthesia] Retryable ${res.status}, attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${backoff}ms`);
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
  throw lastError ?? new Error("Synthesia API call failed after retries");
}

export class SynthesiaProvider implements VideoGenerationProvider {
  readonly name = "SYNTHESIA";

  async createVideo(params: VideoGenerationParams): Promise<ProviderJobResult> {
    const body: Record<string, unknown> = {
      title: params.title,
      input: [
        {
          scriptText: params.script,
          avatar: params.avatarId || "anna_costume1_cameraA",
          background: params.background || "off_white",
        },
      ],
      test: process.env.NODE_ENV !== "production",
    };

    if (params.voiceId) {
      (body.input as Record<string, unknown>[])[0].voiceId = params.voiceId;
    }
    if (params.language) {
      (body.input as Record<string, unknown>[])[0].language = params.language;
    }
    if (params.aspectRatio) {
      body.aspectRatio = params.aspectRatio;
    }

    const res = await fetchWithRetry(`${API_BASE}/videos`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Synthesia video creation failed (${res.status}): ${error}`);
    }

    const data = await res.json();
    return { externalJobId: data.id };
  }

  async getJobStatus(externalJobId: string): Promise<ProviderJobStatus> {
    const res = await fetchWithRetry(`${API_BASE}/videos/${externalJobId}`, {
      method: "GET",
      headers: headers(),
    });

    if (!res.ok) {
      throw new Error(`Synthesia status check failed (${res.status})`);
    }

    const data = await res.json();

    const statusMap: Record<string, ProviderJobStatus["status"]> = {
      in_progress: "processing",
      complete: "completed",
      failed: "failed",
    };

    return {
      status: statusMap[data.status] || "pending",
      progress: data.status === "complete" ? 100 : undefined,
      downloadUrl: data.download || undefined,
      errorMessage: data.error || undefined,
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
