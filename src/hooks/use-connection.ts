"use client";

import { useEffect, useCallback } from "react";
import { useOfflineStore } from "@/stores/offline-store";

type ConnectionQuality = "high" | "medium" | "low" | "offline";

/**
 * Monitor network connection and estimate bandwidth.
 * Adapts content delivery based on connection quality (FIX-7).
 */
export function useConnection() {
  const {
    isOnline,
    connectionQuality,
    setOnline,
    setConnectionQuality,
  } = useOfflineStore();

  const detectQuality = useCallback((): ConnectionQuality => {
    if (!navigator.onLine) return "offline";

    const conn = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection;
    if (!conn) return "high";

    const effectiveType = conn.effectiveType;
    if (effectiveType === "4g" && (conn.downlink ?? 0) > 5) return "high";
    if (effectiveType === "4g" || effectiveType === "3g") return "medium";
    if (effectiveType === "2g") return "low";
    return "low";
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setConnectionQuality(detectQuality());
    };
    const handleOffline = () => {
      setOnline(false);
      setConnectionQuality("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial detection
    setOnline(navigator.onLine);
    setConnectionQuality(detectQuality());

    // Periodic quality check
    const interval = setInterval(() => {
      setConnectionQuality(detectQuality());
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [setOnline, setConnectionQuality, detectQuality]);

  return { isOnline, connectionQuality };
}

/**
 * Get content quality recommendation based on bandwidth.
 */
export function getContentQuality(quality: ConnectionQuality) {
  switch (quality) {
    case "high":
      return { video: "adaptive", maxBudgetMB: 300, loadImages: true };
    case "medium":
      return { video: "240p", maxBudgetMB: 150, loadImages: true };
    case "low":
      return { video: "audio-only", maxBudgetMB: 60, loadImages: false };
    case "offline":
      return { video: "cached", maxBudgetMB: 0, loadImages: false };
  }
}
