"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfHeaders } from "@/lib/utils/csrf";

// ─── Types ──────────────────────────────────────────────────────────

interface VoicePreset {
  id: string;
  name: string;
  ttsVoiceName: string;
  languageCode: string;
  gender: string;
  voiceType: string;
  speakingRate: number;
  pitch: number;
}

interface VoicePickerProps {
  selectedPresetId: string;
  onSelect: (presetId: string) => void;
  language: string;
}

// ─── Language options ───────────────────────────────────────────────

const LANGUAGES = [
  { code: "ko", label: "Korean" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "sw", label: "Swahili" },
  { code: "am", label: "Amharic" },
];

// ─── Component ──────────────────────────────────────────────────────

export default function VoicePicker({
  selectedPresetId,
  onSelect,
  language,
}: VoicePickerProps) {
  const [presets, setPresets] = useState<VoicePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState(language || "en");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (langFilter) params.set("language", langFilter);
      if (genderFilter) params.set("gender", genderFilter);

      const res = await fetch(
        `/api/v1/admin/video-production/voices/presets?${params.toString()}`
      );
      const json = await res.json();
      if (json.data) setPresets(json.data);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [langFilter, genderFilter]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  async function handlePreview(preset: VoicePreset) {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingId === preset.id) {
      setPlayingId(null);
      return;
    }

    setPreviewLoading(preset.id);
    setPreviewError(null);
    try {
      const res = await fetch(
        "/api/v1/admin/video-production/voices/preview",
        {
          method: "POST",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            voiceName: preset.ttsVoiceName,
            languageCode: preset.languageCode,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Preview failed");
      }
      if (!json.data?.audioBase64) {
        throw new Error("No audio data returned");
      }

      const audio = new Audio(
        `data:audio/mpeg;base64,${json.data.audioBase64}`
      );
      audio.onended = () => setPlayingId(null);
      audioRef.current = audio;
      await audio.play();
      setPlayingId(preset.id);
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Preview failed"
      );
    } finally {
      setPreviewLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          <Volume2 className="mr-1.5 inline h-4 w-4" />
          Voice Selection
        </h3>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
          className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {["", "MALE", "FEMALE"].map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                genderFilter === g
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {g === "" ? "All" : g === "MALE" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {previewError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          Preview error: {previewError}
        </div>
      )}

      {/* No voice option */}
      <button
        onClick={() => onSelect("")}
        className={`w-full rounded-lg border-2 p-3 text-left text-sm transition-all ${
          selectedPresetId === ""
            ? "border-brand-500 bg-brand-50/50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className="font-medium text-gray-700">No TTS voice</span>
        <span className="ml-2 text-xs text-gray-400">
          Use Veo default audio
        </span>
      </button>

      {/* Voice list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : presets.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          No voice presets found for this language
        </p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                selectedPresetId === preset.id
                  ? "border-brand-500 bg-brand-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {preset.name}
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {preset.voiceType}
                  </span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                    {preset.gender}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {preset.ttsVoiceName}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(preset);
                }}
                disabled={previewLoading === preset.id}
              >
                {previewLoading === preset.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : playingId === preset.id ? (
                  <Pause className="h-4 w-4 text-brand-600" />
                ) : (
                  <Play className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
