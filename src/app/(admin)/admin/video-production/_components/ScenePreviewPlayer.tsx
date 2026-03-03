"use client";

import { useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Film,
  Wand2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────

interface Scene {
  id: string;
  orderIndex: number;
  speakerLabel: string | null;
  text: string;
  visualNotes: string | null;
  durationSec: number;
  source: "DOCTOR_VIDEO" | "AI_GENERATED" | "STOCK_FOOTAGE" | "HYBRID";
  renderStatus:
    | "PENDING"
    | "UPLOADING"
    | "RENDERING"
    | "POST_PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "SKIPPED";
  uploadedVideoUrl: string | null;
  renderedVideoUrl: string | null;
  finalVideoUrl: string | null;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  errorMessage: string | null;
  version: number;
}

interface ScenePreviewPlayerProps {
  scene: Scene;
  onReRender?: (sceneId: string) => void;
  showReRenderButton?: boolean;
}

// ─── Source label helper ────────────────────────────────────────────

function sourceLabel(source: Scene["source"]): { label: string; icon: typeof Wand2 } {
  switch (source) {
    case "AI_GENERATED":
      return { label: "AI", icon: Wand2 };
    case "DOCTOR_VIDEO":
      return { label: "Doctor", icon: Video };
    case "STOCK_FOOTAGE":
      return { label: "Stock", icon: Film };
    case "HYBRID":
      return { label: "Hybrid", icon: Film };
    default:
      return { label: source, icon: Film };
  }
}

// ─── Component ──────────────────────────────────────────────────────

export default function ScenePreviewPlayer({
  scene,
  onReRender,
  showReRenderButton = false,
}: ScenePreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Resolve the best available video URL
  const videoUrl =
    scene.finalVideoUrl || scene.renderedVideoUrl || scene.uploadedVideoUrl;

  const { label: srcLabel, icon: SrcIcon } = sourceLabel(scene.source);

  // ─── Playback handlers ──────────────────────────────────────────

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ─── Render: No video placeholder ─────────────────────────────

  if (!videoUrl) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-900">
        {/* Placeholder */}
        <div className="flex aspect-video flex-col items-center justify-center gap-3 p-6">
          <Film className="h-10 w-10 text-gray-600" />
          <div className="max-w-xs text-center">
            <p className="text-sm font-medium text-gray-400">
              No video available
            </p>
            <p className="mt-1 line-clamp-3 text-xs text-gray-500">
              {scene.text}
            </p>
          </div>
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-white/80">
              <span className="font-medium">
                Scene {scene.orderIndex + 1}
              </span>
              <span className="text-white/50">&middot;</span>
              <span>{scene.durationSec}s</span>
              <span className="text-white/50">&middot;</span>
              <span className="flex items-center gap-1">
                <SrcIcon className="h-3 w-3" />
                {srcLabel}
              </span>
            </div>
            {showReRenderButton && onReRender && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => onReRender(scene.id)}
              >
                <RefreshCw className="h-3 w-3" />
                Re-render
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Video player ─────────────────────────────────────

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="aspect-video w-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        playsInline
        preload="metadata"
      />

      {/* Info overlay (always visible at top) */}
      <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          <span className="font-medium">Scene {scene.orderIndex + 1}</span>
          <span className="text-white/50">&middot;</span>
          <span>{scene.durationSec}s</span>
          <span className="text-white/50">&middot;</span>
          <span className="flex items-center gap-1">
            <SrcIcon className="h-3 w-3" />
            {srcLabel}
          </span>
          {scene.version > 1 && (
            <>
              <span className="text-white/50">&middot;</span>
              <span className="text-amber-300">v{scene.version}</span>
            </>
          )}
        </div>
      </div>

      {/* Controls bar (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="mb-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-brand-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          aria-label="Seek video"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="rounded p-1 text-white/90 transition-colors hover:text-white"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            {/* Mute toggle */}
            <button
              type="button"
              onClick={toggleMute}
              className="rounded p-1 text-white/90 transition-colors hover:text-white"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            {/* Time display */}
            <span className="text-[11px] tabular-nums text-white/70">
              {formatTime(currentTime)} / {formatTime(duration || scene.durationSec)}
            </span>
          </div>

          {/* Re-render button */}
          {showReRenderButton && onReRender && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => onReRender(scene.id)}
            >
              <RefreshCw className="h-3 w-3" />
              Re-render
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
