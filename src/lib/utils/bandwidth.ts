/**
 * Bandwidth detection and adaptive content strategies.
 * FIX-7: 2G-first load optimization.
 */

export type BandwidthTier = "2g" | "3g" | "4g" | "wifi";

export interface ContentBudget {
  tier: BandwidthTier;
  videoQuality: "audio-only" | "240p" | "480p" | "adaptive";
  maxDownloadMB: number;
  preloadStrategy: "minimal" | "moderate" | "full";
  imageQuality: number; // 1-100
}

/**
 * Get content budget based on bandwidth tier.
 */
export function getContentBudget(tier: BandwidthTier): ContentBudget {
  switch (tier) {
    case "2g":
      return {
        tier: "2g",
        videoQuality: "audio-only",
        maxDownloadMB: 60,
        preloadStrategy: "minimal",
        imageQuality: 30,
      };
    case "3g":
      return {
        tier: "3g",
        videoQuality: "240p",
        maxDownloadMB: 150,
        preloadStrategy: "moderate",
        imageQuality: 60,
      };
    case "4g":
      return {
        tier: "4g",
        videoQuality: "480p",
        maxDownloadMB: 300,
        preloadStrategy: "full",
        imageQuality: 80,
      };
    case "wifi":
      return {
        tier: "wifi",
        videoQuality: "adaptive",
        maxDownloadMB: 500,
        preloadStrategy: "full",
        imageQuality: 90,
      };
  }
}

/**
 * Get HLS rendition preference based on bandwidth tier.
 */
export function getPreferredRendition(tier: BandwidthTier): string {
  switch (tier) {
    case "2g":
      return "audio"; // Audio-only track
    case "3g":
      return "240p";
    case "4g":
      return "480p";
    case "wifi":
      return "auto"; // Adaptive bitrate
  }
}

/**
 * Estimate download time for a given file size.
 */
export function estimateDownloadTime(
  fileSizeBytes: number,
  tier: BandwidthTier
): number {
  const speeds: Record<BandwidthTier, number> = {
    "2g": 50 * 1024, // 50 KB/s
    "3g": 500 * 1024, // 500 KB/s
    "4g": 2 * 1024 * 1024, // 2 MB/s
    wifi: 5 * 1024 * 1024, // 5 MB/s
  };

  return Math.ceil(fileSizeBytes / speeds[tier]);
}

/**
 * Format download time for display.
 */
export function formatDownloadTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
