/**
 * Provider factory — returns the right provider instance by enum value.
 */

import type { VideoProvider } from "@prisma/client";
import type { VideoGenerationProvider, FaceSwapProvider } from "./types";
import { SynthesiaProvider } from "./synthesia";
import { HeyGenProvider } from "./heygen";
import { AkoolProvider } from "./akool";
import { WaveSpeedProvider } from "./wavespeed";

const videoGenerationProviders: Record<string, VideoGenerationProvider> = {
  SYNTHESIA: new SynthesiaProvider(),
  HEYGEN: new HeyGenProvider(),
};

const faceSwapProviders: Record<string, FaceSwapProvider> = {
  AKOOL: new AkoolProvider(),
  WAVESPEED_AI: new WaveSpeedProvider(),
};

export function getVideoGenerationProvider(
  provider: VideoProvider
): VideoGenerationProvider {
  const p = videoGenerationProviders[provider];
  if (!p) {
    throw new Error(`Unsupported video generation provider: ${provider}. Use SYNTHESIA or HEYGEN.`);
  }
  return p;
}

export function getFaceSwapProvider(
  provider: VideoProvider
): FaceSwapProvider {
  const p = faceSwapProviders[provider];
  if (!p) {
    throw new Error(`Unsupported face swap provider: ${provider}. Use AKOOL or WAVESPEED_AI.`);
  }
  return p;
}

export function isVideoGenerationProvider(provider: VideoProvider): boolean {
  return provider === "SYNTHESIA" || provider === "HEYGEN";
}

export function isFaceSwapProvider(provider: VideoProvider): boolean {
  return provider === "AKOOL" || provider === "WAVESPEED_AI";
}
