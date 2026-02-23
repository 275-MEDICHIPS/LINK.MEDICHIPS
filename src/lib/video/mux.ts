const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
const MUX_BASE_URL = "https://api.mux.com";

function muxHeaders(): HeadersInit {
  const credentials = Buffer.from(
    `${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`
  ).toString("base64");
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${credentials}`,
  };
}

/**
 * Create a Mux asset from a URL.
 */
export async function createAsset(inputUrl: string): Promise<{
  assetId: string;
  playbackId: string;
}> {
  const res = await fetch(`${MUX_BASE_URL}/video/v1/assets`, {
    method: "POST",
    headers: muxHeaders(),
    body: JSON.stringify({
      input: [{ url: inputUrl }],
      playback_policy: ["signed"],
      mp4_support: "standard",
      master_access: "temporary",
      encoding_tier: "baseline", // Cost-effective for education content
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Mux asset creation failed: ${error}`);
  }

  const data = await res.json();
  const asset = data.data;
  return {
    assetId: asset.id,
    playbackId: asset.playback_ids?.[0]?.id || "",
  };
}

/**
 * Get Mux direct upload URL for client-side upload.
 */
export async function createDirectUpload(): Promise<{
  uploadId: string;
  uploadUrl: string;
}> {
  const res = await fetch(`${MUX_BASE_URL}/video/v1/uploads`, {
    method: "POST",
    headers: muxHeaders(),
    body: JSON.stringify({
      new_asset_settings: {
        playback_policy: ["signed"],
        mp4_support: "standard",
        encoding_tier: "baseline",
      },
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || "*",
    }),
  });

  if (!res.ok) throw new Error("Mux upload creation failed");

  const data = await res.json();
  return {
    uploadId: data.data.id,
    uploadUrl: data.data.url,
  };
}

/**
 * Get asset status.
 */
export async function getAssetStatus(
  assetId: string
): Promise<{
  status: string;
  playbackId: string;
  duration: number;
  aspectRatio: string;
}> {
  const res = await fetch(`${MUX_BASE_URL}/video/v1/assets/${assetId}`, {
    headers: muxHeaders(),
  });

  if (!res.ok) throw new Error("Failed to get asset status");

  const data = await res.json();
  const asset = data.data;
  return {
    status: asset.status,
    playbackId: asset.playback_ids?.[0]?.id || "",
    duration: asset.duration || 0,
    aspectRatio: asset.aspect_ratio || "16:9",
  };
}

/**
 * Delete a Mux asset.
 */
export async function deleteAsset(assetId: string): Promise<void> {
  await fetch(`${MUX_BASE_URL}/video/v1/assets/${assetId}`, {
    method: "DELETE",
    headers: muxHeaders(),
  });
}

/**
 * Generate a signed playback token for HLS streaming.
 */
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get thumbnail URL.
 */
export function getThumbnailUrl(
  playbackId: string,
  opts?: { width?: number; time?: number }
): string {
  const params = new URLSearchParams();
  if (opts?.width) params.set("width", String(opts.width));
  if (opts?.time) params.set("time", String(opts.time));
  const qs = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${qs ? `?${qs}` : ""}`;
}
