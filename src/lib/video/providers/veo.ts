/**
 * Google Veo 3.1 provider — Vertex AI video generation.
 *
 * Uses the Vertex AI predictLongRunning API to generate videos from text prompts.
 * Output is stored in GCS, then ingested to Mux.
 *
 * Models:
 *   - veo-3.1-generate-001 (standard quality)
 *   - veo-3.1-fast-generate-001 (faster, lower quality)
 *
 * Docs: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
 */

import type {
  VideoGenerationProvider,
  VideoGenerationParams,
  FaceSwapProvider,
  FaceSwapParams,
  ProviderJobResult,
  ProviderJobStatus,
} from "./types";

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "medichips-new";
const GCP_LOCATION = process.env.VEO_LOCATION || "us-central1";
const VEO_MODEL = process.env.VEO_MODEL || "veo-3.1-generate-001";
const GCS_OUTPUT_BUCKET = process.env.GCS_BUCKET_MEDIA || "medichips-link-media";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

// Veo pricing: ~$0.35/sec for standard, varies by resolution
const COST_PER_SECOND_USD = 0.35;

// ─── Auth ─────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  // 1) Try Google Application Default Credentials metadata server (Cloud Run)
  try {
    const res = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
      { headers: { "Metadata-Flavor": "Google" } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }
  } catch {
    // Not on GCE/Cloud Run, fall through
  }

  // 2) Use service account key file if available
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (tokenRes.token) return tokenRes.token;
  }

  throw new Error(
    "Cannot obtain GCP access token. Set GOOGLE_APPLICATION_CREDENTIALS or run on GCP."
  );
}

function apiBase(): string {
  return `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models`;
}

// ─── Helpers ──────────────────────────────────────────────────────────

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
        console.warn(
          `[veo] Retryable ${res.status}, attempt ${attempt + 1}/${MAX_RETRIES}. Waiting ${backoff}ms`
        );
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
  throw lastError ?? new Error("Veo API call failed after retries");
}

// ─── Provider Implementation ──────────────────────────────────────────

export class VeoProvider implements VideoGenerationProvider {
  readonly name = "VEO";

  async createVideo(params: VideoGenerationParams): Promise<ProviderJobResult> {
    const token = await getAccessToken();
    const config = params.config || {};

    // Build the prompt from script segments or raw script
    let prompt = params.script;
    if (params.segments && params.segments.length > 0) {
      prompt = params.segments
        .map((s) => {
          const visual = s.visualNotes ? ` [Visual: ${s.visualNotes}]` : "";
          return `${s.text}${visual}`;
        })
        .join(" ");
    }

    // Determine duration — Veo supports 4, 6, or 8 seconds per clip
    // For longer scripts, we'll generate an 8-second clip as a starting point
    const durationSeconds = Math.min(
      (config.durationSeconds as number) || 8,
      8
    );

    const body = {
      instances: [
        {
          prompt: `Medical education video: ${prompt}`,
        },
      ],
      parameters: {
        storageUri: `gs://${GCS_OUTPUT_BUCKET}/veo-output/${Date.now()}/`,
        sampleCount: 1,
        durationSeconds,
        aspectRatio: params.aspectRatio === "9:16" ? "9:16" : "16:9",
        resolution: (config.resolution as string) || "720p",
        generateAudio: config.generateAudio !== false,
        ...(config.negativePrompt
          ? { negativePrompt: config.negativePrompt as string }
          : {}),
        ...(config.seed ? { seed: config.seed as number } : {}),
      },
    };

    const res = await fetchWithRetry(
      `${apiBase()}/${VEO_MODEL}:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Veo video creation failed (${res.status}): ${error}`);
    }

    const data = await res.json();
    // Response: { "name": "projects/.../operations/OPERATION_ID" }
    const operationName = data.name;
    if (!operationName) {
      throw new Error("Veo did not return an operation name");
    }

    return { externalJobId: operationName };
  }

  async getJobStatus(externalJobId: string): Promise<ProviderJobStatus> {
    const token = await getAccessToken();

    // externalJobId is the full operation name:
    // projects/PROJECT/locations/LOCATION/publishers/google/models/MODEL/operations/OP_ID
    const res = await fetchWithRetry(
      `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/${externalJobId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Veo status check failed (${res.status})`);
    }

    const data = await res.json();

    if (data.done === true) {
      if (data.error) {
        return {
          status: "failed",
          errorMessage: data.error.message || "Veo generation failed",
        };
      }

      // Extract video URL from response
      const response = data.response;
      const videos = response?.generateVideoResponse?.generatedSamples
        || response?.predictions;

      let downloadUrl: string | undefined;
      if (videos && videos.length > 0) {
        const video = videos[0];
        downloadUrl = video.video?.uri
          || video.video?.gcsUri
          || video.uri
          || video.gcsUri;
      }

      return {
        status: "completed",
        progress: 100,
        downloadUrl,
      };
    }

    // Still processing
    const metadata = data.metadata;
    const progress = metadata?.partialResult
      ? 50
      : undefined;

    return {
      status: "processing",
      progress,
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
    return Math.ceil(durationSec) * COST_PER_SECOND_USD;
  }
}

/**
 * Veo can also be used for "face swap"-like workflows by generating
 * a new video based on reference images. This wraps the image-to-video
 * capability of Veo.
 */
export class VeoFaceSwapProvider implements FaceSwapProvider {
  readonly name = "VEO";

  async createFaceSwap(params: FaceSwapParams): Promise<ProviderJobResult> {
    const token = await getAccessToken();
    const config = params.config || {};

    const body = {
      instances: [
        {
          prompt: "Recreate this medical education video with the provided reference face",
          video: {
            gcsUri: params.sourceVideoUrl,
          },
          ...(params.targetFaceImageUrl && {
            referenceImages: [
              {
                referenceImage: {
                  imageUri: params.targetFaceImageUrl,
                },
                referenceType: "STYLE",
              },
            ],
          }),
        },
      ],
      parameters: {
        storageUri: `gs://${GCS_OUTPUT_BUCKET}/veo-faceswap/${Date.now()}/`,
        sampleCount: 1,
        aspectRatio: "16:9",
        resolution: params.resolution || "720p",
        ...(config.seed ? { seed: config.seed as number } : {}),
      },
    };

    const res = await fetchWithRetry(
      `${apiBase()}/${VEO_MODEL}:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Veo face swap failed (${res.status}): ${error}`);
    }

    const data = await res.json();
    return { externalJobId: data.name };
  }

  async getJobStatus(externalJobId: string): Promise<ProviderJobStatus> {
    // Same polling mechanism as video generation
    const veoGen = new VeoProvider();
    return veoGen.getJobStatus(externalJobId);
  }

  async getDownloadUrl(externalJobId: string): Promise<string> {
    const status = await this.getJobStatus(externalJobId);
    if (!status.downloadUrl) {
      throw new Error("Face swap not ready for download");
    }
    return status.downloadUrl;
  }

  estimateCost(durationSec: number): number {
    return Math.ceil(durationSec) * COST_PER_SECOND_USD;
  }
}
