/**
 * Provider factory — returns the right provider instance by enum value.
 */

import type { VideoGenerationProvider, FaceSwapProvider } from "./types";
import { VeoProvider, VeoFaceSwapProvider } from "./veo";

const videoGenerationProviders: Record<string, VideoGenerationProvider> = {
  VEO: new VeoProvider(),
};

const faceSwapProviders: Record<string, FaceSwapProvider> = {
  VEO: new VeoFaceSwapProvider(),
};

export function getVideoGenerationProvider(
  provider: string
): VideoGenerationProvider {
  const p = videoGenerationProviders[provider];
  if (!p) {
    throw new Error(`Unsupported video generation provider: ${provider}. Only VEO is supported.`);
  }
  return p;
}

export function getFaceSwapProvider(
  provider: string
): FaceSwapProvider {
  const p = faceSwapProviders[provider];
  if (!p) {
    throw new Error(`Unsupported face swap provider: ${provider}. Only VEO is supported.`);
  }
  return p;
}

export function isVideoGenerationProvider(provider: string): boolean {
  return provider === "VEO";
}

export function isFaceSwapProvider(provider: string): boolean {
  return provider === "VEO";
}
