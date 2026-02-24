/**
 * Video production provider interfaces.
 *
 * Two provider categories:
 * - VideoGenerationProvider: AI avatar video generation (Synthesia, HeyGen)
 * - FaceSwapProvider: Face replacement on existing video (Akool, WaveSpeedAI)
 */

// ─── Shared types ───────────────────────────────────────────────────────

export interface ProviderJobResult {
  externalJobId: string;
}

export interface ProviderJobStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number; // 0-100
  downloadUrl?: string;
  errorMessage?: string;
}

export interface ScriptSegment {
  speakerLabel: string;
  text: string;
  durationSec: number;
  visualNotes?: string;
}

// ─── Video Generation (Method 1: AI Generated) ─────────────────────────

export interface VideoGenerationParams {
  title: string;
  script: string;
  segments?: ScriptSegment[];
  avatarId?: string;
  voiceId?: string;
  language?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  background?: string;
  config?: Record<string, unknown>;
}

export interface VideoGenerationProvider {
  readonly name: string;
  createVideo(params: VideoGenerationParams): Promise<ProviderJobResult>;
  getJobStatus(externalJobId: string): Promise<ProviderJobStatus>;
  getDownloadUrl(externalJobId: string): Promise<string>;
  estimateCost(durationSec: number): number;
}

// ─── Face Swap (Method 2) ───────────────────────────────────────────────

export interface FaceSwapParams {
  sourceVideoUrl: string;
  targetFaceImageUrl?: string;
  faceMapping?: Record<string, string>; // sourceFaceId → targetImageUrl
  blurOriginalFaces?: boolean;
  preserveExpressions?: boolean;
  resolution?: string;
  fidelityLevel?: string;
  config?: Record<string, unknown>;
}

export interface FaceSwapProvider {
  readonly name: string;
  createFaceSwap(params: FaceSwapParams): Promise<ProviderJobResult>;
  getJobStatus(externalJobId: string): Promise<ProviderJobStatus>;
  getDownloadUrl(externalJobId: string): Promise<string>;
  estimateCost(durationSec: number): number;
}
