"use client";

import { Wand2, Video } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

type SceneSource = "DOCTOR_VIDEO" | "AI_GENERATED" | "STOCK_FOOTAGE" | "HYBRID";

interface SceneSourceSelectorProps {
  sceneId: string;
  currentSource: SceneSource;
  onSourceChange: (sceneId: string, source: SceneSource) => void;
  disabled?: boolean;
  /** Estimated cost per second for AI generation (default $0.35) */
  costPerSec?: number;
  /** Scene duration in seconds, used to compute savings display */
  durationSec?: number;
}

// ─── Source options ──────────────────────────────────────────────────

const SOURCE_OPTIONS: {
  value: SceneSource;
  label: string;
  icon: typeof Wand2;
  description: string;
}[] = [
  {
    value: "AI_GENERATED",
    label: "AI Generated",
    icon: Wand2,
    description: "Veo generates video",
  },
  {
    value: "DOCTOR_VIDEO",
    label: "Doctor Video",
    icon: Video,
    description: "Upload your own",
  },
];

// ─── Component ──────────────────────────────────────────────────────

export default function SceneSourceSelector({
  sceneId,
  currentSource,
  onSourceChange,
  disabled = false,
  costPerSec = 0.35,
  durationSec = 0,
}: SceneSourceSelectorProps) {
  const savings = durationSec > 0 ? durationSec * costPerSec : 0;

  return (
    <div className="flex items-center gap-1.5">
      {SOURCE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = currentSource === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!isSelected) {
                onSourceChange(sceneId, option.value);
              }
            }}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all ${
              isSelected
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            aria-pressed={isSelected}
            aria-label={`${option.label}: ${option.description}`}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{option.label}</span>
          </button>
        );
      })}

      {/* Cost savings indicator when Doctor Video is selected */}
      {currentSource === "DOCTOR_VIDEO" && savings > 0 && (
        <span className="ml-1 text-[11px] font-medium text-green-600">
          saves ~${savings.toFixed(2)}
        </span>
      )}
    </div>
  );
}
