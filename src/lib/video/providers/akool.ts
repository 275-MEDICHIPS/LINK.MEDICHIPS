/**
 * Akool API provider — face swap on existing video.
 *
 * API docs: https://docs.akool.com
 * Pricing: ~$15/5min of processed video
 */

import type {
  FaceSwapProvider,
  FaceSwapParams,
  ProviderJobResult,
  ProviderJobStatus,
} from "./types";

const API_BASE = "https://openapi.akool.com/api/open/v3";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const COST_PER_5MIN_USD = 15;

function getApiKey(): string {
  const key = process.env.AKOOL_API_KEY;
  if (!key) throw new Error("AKOOL_API_KEY is not set");
  return key;
}

function getClientId(): string {
  const id = process.env.AKOOL_CLIENT_ID;
  if (!id) throw new Error("AKOOL_CLIENT_ID is not set");
  return id;
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
        console.warn(`[akool] Retryable ${res.status}, attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${backoff}ms`);
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
  throw lastError ?? new Error("Akool API call failed after retries");
}

export class AkoolProvider implements FaceSwapProvider {
  readonly name = "AKOOL";

  async createFaceSwap(params: FaceSwapParams): Promise<ProviderJobResult> {
    const body: Record<string, unknown> = {
      sourceUrl: params.sourceVideoUrl,
      clientId: getClientId(),
      fidelity: params.fidelityLevel === "low" ? 0.5 : 1.0,
    };

    if (params.targetFaceImageUrl) {
      body.targetUrl = params.targetFaceImageUrl;
    }
    if (params.faceMapping) {
      body.faceMapping = params.faceMapping;
    }

    const res = await fetchWithRetry(`${API_BASE}/faceswap/highquality/specifyvideo`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Akool face swap failed (${res.status}): ${error}`);
    }

    const data = await res.json();
    return { externalJobId: data.data?._id || data.data?.id };
  }

  async getJobStatus(externalJobId: string): Promise<ProviderJobStatus> {
    const res = await fetchWithRetry(
      `${API_BASE}/faceswap/highquality/infobyid?id=${externalJobId}`,
      { method: "GET", headers: headers() }
    );

    if (!res.ok) {
      throw new Error(`Akool status check failed (${res.status})`);
    }

    const data = await res.json();
    const jobData = data.data;

    // Akool status: 1=pending, 2=processing, 3=completed, 4=failed
    const statusMap: Record<number, ProviderJobStatus["status"]> = {
      1: "pending",
      2: "processing",
      3: "completed",
      4: "failed",
    };

    return {
      status: statusMap[jobData?.faceswap_status] || "pending",
      progress: jobData?.faceswap_status === 3 ? 100 : undefined,
      downloadUrl: jobData?.video_url || undefined,
      errorMessage: jobData?.error || undefined,
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
