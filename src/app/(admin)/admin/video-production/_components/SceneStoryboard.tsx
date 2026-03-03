"use client";

import { useState, useMemo } from "react";
import {
  GripVertical,
  Clock,
  Loader2,
  Check,
  X,
  AlertCircle,
  SkipForward,
  Upload,
  DollarSign,
  Film,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SceneSourceSelector from "./SceneSourceSelector";
import SceneVideoUploader from "./SceneVideoUploader";
import ScenePreviewPlayer from "./ScenePreviewPlayer";

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

type StoryboardMode = "setup" | "rendering" | "review";

interface SceneStoryboardProps {
  scenes: Scene[];
  onSceneSelect?: (sceneId: string) => void;
  selectedSceneId?: string;
  mode: StoryboardMode;
  onReorder?: (sceneOrder: string[]) => void;
  /** Job ID for upload operations */
  jobId?: string;
  /** Called when a scene source changes */
  onSourceChange?: (sceneId: string, source: Scene["source"]) => void;
  /** Called when a video upload completes for a scene */
  onUploadComplete?: (sceneId: string, url: string, gcsPath: string) => void;
  /** Called when re-render is requested for a scene */
  onReRender?: (sceneId: string) => void;
  /** Cost per second for AI generation (default $0.35) */
  costPerSec?: number;
}

// ─── Status config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Scene["renderStatus"],
  { icon: typeof Check; color: string; bgColor: string; label: string }
> = {
  PENDING: {
    icon: Clock,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    label: "Pending",
  },
  UPLOADING: {
    icon: Upload,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Uploading",
  },
  RENDERING: {
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Rendering",
  },
  POST_PROCESSING: {
    icon: Loader2,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    label: "Processing",
  },
  COMPLETED: {
    icon: Check,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Done",
  },
  FAILED: {
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Failed",
  },
  SKIPPED: {
    icon: SkipForward,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    label: "Skipped",
  },
};

// ─── Drag & drop reorder helpers ────────────────────────────────────

function useDragReorder(
  scenes: Scene[],
  onReorder?: (sceneOrder: string[]) => void
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    if (
      dragIndex !== null &&
      dragOverIndex !== null &&
      dragIndex !== dragOverIndex &&
      onReorder
    ) {
      const newOrder = [...scenes];
      const [moved] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, moved);
      onReorder(newOrder.map((s) => s.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

// ─── Scene card sub-component ───────────────────────────────────────

function SceneCard({
  scene,
  index,
  mode,
  isSelected,
  onSelect,
  jobId,
  onSourceChange,
  onUploadComplete,
  onReRender,
  costPerSec,
  // Drag props
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  canDrag,
}: {
  scene: Scene;
  index: number;
  mode: StoryboardMode;
  isSelected: boolean;
  onSelect?: () => void;
  jobId?: string;
  onSourceChange?: (sceneId: string, source: Scene["source"]) => void;
  onUploadComplete?: (sceneId: string, url: string, gcsPath: string) => void;
  onReRender?: (sceneId: string) => void;
  costPerSec: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  canDrag: boolean;
}) {
  const status = STATUS_CONFIG[scene.renderStatus];
  const StatusIcon = status.icon;
  const isAnimated =
    scene.renderStatus === "RENDERING" ||
    scene.renderStatus === "POST_PROCESSING" ||
    scene.renderStatus === "UPLOADING";

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        isSelected
          ? "border-brand-500 shadow-sm"
          : isDragOver
            ? "border-brand-300 bg-brand-50/30"
            : "border-gray-200 hover:border-gray-300"
      } ${isDragging ? "opacity-50" : ""}`}
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {/* Card header row */}
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 p-3 text-left"
        aria-label={`Scene ${index + 1}: ${scene.speakerLabel || "No speaker"}`}
      >
        {/* Drag handle (setup mode only) */}
        {canDrag && (
          <div
            className="mt-0.5 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            aria-hidden="true"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Scene number */}
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {index + 1}
        </div>

        {/* Scene text content */}
        <div className="min-w-0 flex-1">
          {/* Speaker label */}
          {scene.speakerLabel && (
            <p className="mb-0.5 text-xs font-semibold text-brand-600">
              {scene.speakerLabel}
            </p>
          )}
          {/* Script text (2-line truncation) */}
          <p className="line-clamp-2 text-sm text-gray-700">{scene.text}</p>
          {/* Visual notes */}
          {scene.visualNotes && (
            <p className="mt-0.5 line-clamp-1 text-[11px] italic text-gray-400">
              {scene.visualNotes}
            </p>
          )}
        </div>

        {/* Right side: Duration + Status */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          {/* Duration badge */}
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            <Clock className="h-3 w-3" />
            {scene.durationSec}s
          </span>

          {/* Render status badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.bgColor} ${status.color}`}
          >
            <StatusIcon
              className={`h-3 w-3 ${isAnimated ? "animate-spin" : ""}`}
            />
            {status.label}
          </span>
        </div>
      </button>

      {/* Mode-specific content */}
      {mode === "setup" && (
        <div className="space-y-2 border-t border-gray-100 px-3 pb-3 pt-2">
          {/* Source selector */}
          {onSourceChange && (
            <SceneSourceSelector
              sceneId={scene.id}
              currentSource={scene.source}
              onSourceChange={onSourceChange}
              costPerSec={costPerSec}
              durationSec={scene.durationSec}
            />
          )}

          {/* Upload widget (shown when DOCTOR_VIDEO selected) */}
          {scene.source === "DOCTOR_VIDEO" && jobId && onUploadComplete && (
            <SceneVideoUploader
              sceneId={scene.id}
              jobId={jobId}
              uploadedVideoUrl={scene.uploadedVideoUrl}
              onUploadComplete={onUploadComplete}
            />
          )}
        </div>
      )}

      {mode === "rendering" && scene.renderStatus === "FAILED" && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-2">
              {scene.errorMessage || "Rendering failed"}
            </span>
          </div>
        </div>
      )}

      {mode === "review" && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
          <ScenePreviewPlayer
            scene={scene}
            onReRender={onReRender}
            showReRenderButton={
              scene.renderStatus === "COMPLETED" ||
              scene.renderStatus === "FAILED"
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────

export default function SceneStoryboard({
  scenes,
  onSceneSelect,
  selectedSceneId,
  mode,
  onReorder,
  jobId,
  onSourceChange,
  onUploadComplete,
  onReRender,
  costPerSec = 0.35,
}: SceneStoryboardProps) {
  const sortedScenes = useMemo(
    () => [...scenes].sort((a, b) => a.orderIndex - b.orderIndex),
    [scenes]
  );

  const {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useDragReorder(sortedScenes, onReorder);

  // ─── Cost summary ────────────────────────────────────────────────

  const costSummary = useMemo(() => {
    const aiScenes = sortedScenes.filter(
      (s) => s.source === "AI_GENERATED" || s.source === "HYBRID"
    );
    const totalAiSeconds = aiScenes.reduce(
      (sum, s) => sum + s.durationSec,
      0
    );
    const estimatedTotal = totalAiSeconds * costPerSec;

    const actualTotal = sortedScenes.reduce(
      (sum, s) => sum + (s.actualCostUsd ?? 0),
      0
    );

    return {
      totalScenes: sortedScenes.length,
      aiSceneCount: aiScenes.length,
      totalAiSeconds,
      estimatedTotal,
      actualTotal,
      hasActualCosts: actualTotal > 0,
    };
  }, [sortedScenes, costPerSec]);

  // ─── Rendering progress ──────────────────────────────────────────

  const renderingProgress = useMemo(() => {
    if (mode !== "rendering") return null;
    const completed = sortedScenes.filter(
      (s) =>
        s.renderStatus === "COMPLETED" || s.renderStatus === "SKIPPED"
    ).length;
    const failed = sortedScenes.filter(
      (s) => s.renderStatus === "FAILED"
    ).length;
    const active = sortedScenes.filter(
      (s) =>
        s.renderStatus === "RENDERING" ||
        s.renderStatus === "POST_PROCESSING" ||
        s.renderStatus === "UPLOADING"
    ).length;
    const total = sortedScenes.length;

    return { completed, failed, active, total };
  }, [sortedScenes, mode]);

  const canDrag = mode === "setup" && !!onReorder;

  // ─── Render ───────────────────────────────────────────────────────

  if (sortedScenes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <Film className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            No scenes yet. Generate a script first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with mode-specific info */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Film className="h-4 w-4" />
          Scenes ({sortedScenes.length})
        </h3>

        {/* Batch source toggle (setup mode) */}
        {mode === "setup" && onSourceChange && (
          <div className="flex gap-1">
            <button
              onClick={() =>
                sortedScenes.forEach((s) =>
                  onSourceChange(s.id, "AI_GENERATED")
                )
              }
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
            >
              All AI
            </button>
            <button
              onClick={() =>
                sortedScenes.forEach((s) =>
                  onSourceChange(s.id, "DOCTOR_VIDEO")
                )
              }
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
            >
              All Doctor
            </button>
          </div>
        )}

        {/* Rendering progress bar */}
        {renderingProgress && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">
              {renderingProgress.completed}/{renderingProgress.total} done
            </span>
            {renderingProgress.active > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                {renderingProgress.active} rendering
              </span>
            )}
            {renderingProgress.failed > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3 w-3" />
                {renderingProgress.failed} failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scene list */}
      <div className="space-y-2">
        {sortedScenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={index}
            mode={mode}
            isSelected={selectedSceneId === scene.id}
            onSelect={
              onSceneSelect ? () => onSceneSelect(scene.id) : undefined
            }
            jobId={jobId}
            onSourceChange={onSourceChange}
            onUploadComplete={onUploadComplete}
            onReRender={onReRender}
            costPerSec={costPerSec}
            isDragging={dragIndex === index}
            isDragOver={dragOverIndex === index}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            canDrag={canDrag}
          />
        ))}
      </div>

      {/* Cost summary footer */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="h-4 w-4" />
          <span>Cost Estimate</span>
        </div>
        <div className="text-right">
          {costSummary.hasActualCosts ? (
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-900">
                ${costSummary.actualTotal.toFixed(2)}
              </p>
              <p className="text-[11px] text-gray-400">
                actual cost
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-900">
                ${costSummary.estimatedTotal.toFixed(2)}
              </p>
              <p className="text-[11px] text-gray-400">
                {costSummary.aiSceneCount} AI scene{costSummary.aiSceneCount !== 1 ? "s" : ""}
                {" "}&times; {costSummary.totalAiSeconds}s &times; ${costPerSec.toFixed(2)}/s
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
