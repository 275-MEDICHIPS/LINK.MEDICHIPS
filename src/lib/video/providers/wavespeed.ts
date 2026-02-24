/**
 * WaveSpeedAI provider — face swap on existing video.
 *
 * API docs: https://docs.wavespeed.ai
 * Pricing: ~$6/5min of processed video
 */

import type {
  FaceSwapProvider,
  FaceSwapParams,
  ProviderJobResult,
  ProviderJobStatus,
} from "./types";

const API_BASE = "https://api.wavespeed.ai/v1";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const COST_PER_5MIN_USD = 6;

function getApiKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) throw new Error("WAVESPEED_API_KEY is not set");
  return key;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
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
        console.warn(`[wavespeed] Retryable ${res.status}, attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${backoff}ms`);
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
  throw lastError ?? new Error("WaveSpeed API call failed after retries");
}

export class WaveSpeedProvider implements FaceSwapProvider {
  readonly name = "WAVESPEED_AI";

  async createFaceSwap(params: FaceSwapParams): Promise<ProviderJobResult> {
    const body: Record<string, unknown> = {
      video_url: params.sourceVideoUrl,
      preserve_expressions: params.preserveExpressions ?? true,
      resolution: params.resolution || "1080p",
    };

    if (params.targetFaceImageUrl) {
      body.target_face_url = params.targetFaceImageUrl;
    }
    if (params.faceMapping) {
      body.face_mapping = params.faceMapping;
    }

    const res = await fetchWithRetry(`${API_BASE}/faceswap/video`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`WaveSpeed face swap failed (${res.status}): ${error}`);
    }

    const data = await res.json();
    return { externalJobId: data.data?.task_id || data.id };
  }

  async getJobStatus(externalJobId: string): Promise<ProviderJobStatus> {
    const res = await fetchWithRetry(
      `${API_BASE}/faceswap/status/${externalJobId}`,
      { method: "GET", headers: headers() }
    );

    if (!res.ok) {
      throw new Error(`WaveSpeed status check failed (${res.status})`);
    }

    const data = await res.json();
    const taskData = data.data;

    const statusMap: Record<string, ProviderJobStatus["status"]> = {
      queued: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
    };

    return {
      status: statusMap[taskData?.status] || "pending",
      progress: taskData?.progress || undefined,
      downloadUrl: taskData?.output_url || undefined,
      errorMessage: taskData?.error_message || undefined,
    };
  }

  async getDownloadUrl(externalJobId: string): Promise<string> {
    const status = await this.getJobStatus(externalJobId);
    if (!status.downloadUrl) {
      throw new Error("Face swap not ready for download");
    }
    return status.downloadUrl;
  }

  estimateCost(durationSec: number): number {
    return Math.ceil(durationSec / 300) * COST_PER_5MIN_USD;
  }
}
