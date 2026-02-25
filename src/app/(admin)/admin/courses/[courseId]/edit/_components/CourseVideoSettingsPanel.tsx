"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfHeaders } from "@/lib/utils/csrf";

interface VideoSettings {
  id?: string;
  avatarId: string | null;
  voicePresetId: string | null;
  speakerName: string | null;
  visualStyle: string | null;
  targetLocale: string;
  additionalInstructions: string | null;
}

interface VideoStatusStats {
  noVideo: number;
  generating: number;
  review: number;
  completed: number;
}

interface Props {
  courseId: string;
  onBatchGenerate?: () => void;
}

const VISUAL_STYLES = [
  { value: "clinical_modern", label: "Clinical Modern" },
  { value: "animated", label: "Animated" },
  { value: "documentary", label: "Documentary" },
  { value: "whiteboard", label: "Whiteboard" },
];

export default function CourseVideoSettingsPanel({
  courseId,
  onBatchGenerate,
}: Props) {
  const [settings, setSettings] = useState<VideoSettings>({
    avatarId: null,
    voicePresetId: null,
    speakerName: null,
    visualStyle: null,
    targetLocale: "en",
    additionalInstructions: null,
  });
  const [stats, setStats] = useState<VideoStatusStats | null>(null);
  const [totalLessons, setTotalLessons] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Avatar & voice lists
  const [avatars, setAvatars] = useState<
    { id: string; name: string }[]
  >([]);
  const [voices, setVoices] = useState<
    { id: string; name: string; languageCode: string }[]
  >([]);

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}/video-settings`),
        fetch(`/api/v1/courses/${courseId}/video-status`),
      ]);
      const settingsJson = await settingsRes.json();
      const statusJson = await statusRes.json();

      if (settingsJson.data) {
        setSettings({
          id: settingsJson.data.id,
          avatarId: settingsJson.data.avatarId,
          voicePresetId: settingsJson.data.voicePresetId,
          speakerName: settingsJson.data.speakerName,
          visualStyle: settingsJson.data.visualStyle,
          targetLocale: settingsJson.data.targetLocale || "en",
          additionalInstructions: settingsJson.data.additionalInstructions,
        });
      }
      if (statusJson.data) {
        setStats(statusJson.data.stats);
        setTotalLessons(statusJson.data.totalLessons);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const fetchOptions = useCallback(async () => {
    try {
      const [avatarRes, voiceRes] = await Promise.all([
        fetch("/api/v1/admin/video-production/avatars"),
        fetch("/api/v1/admin/video-production/voices"),
      ]);
      const avatarJson = await avatarRes.json();
      const voiceJson = await voiceRes.json();
      if (avatarJson.data) setAvatars(avatarJson.data);
      if (voiceJson.data) setVoices(voiceJson.data);
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchOptions();
  }, [fetchSettings, fetchOptions]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/v1/courses/${courseId}/video-settings`, {
        method: "PUT",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(settings),
      });
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading video settings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-3.5 w-3.5 text-gray-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Video Settings
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Avatar
          </label>
          <select
            value={settings.avatarId ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                avatarId: e.target.value || null,
              }))
            }
            className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">None (Provider default)</option>
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Voice
          </label>
          <select
            value={settings.voicePresetId ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                voicePresetId: e.target.value || null,
              }))
            }
            className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">Provider default</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.languageCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Speaker Name
          </label>
          <Input
            value={settings.speakerName ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                speakerName: e.target.value || null,
              }))
            }
            placeholder="e.g., Dr. Kim"
            className="h-9 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Visual Style
          </label>
          <select
            value={settings.visualStyle ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                visualStyle: e.target.value || null,
              }))
            }
            className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">Default</option>
            {VISUAL_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Shared Instructions
          </label>
          <textarea
            value={settings.additionalInstructions ?? ""}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                additionalInstructions: e.target.value || null,
              }))
            }
            rows={2}
            placeholder="Context shared across all videos..."
            className="flex w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Video Status Summary */}
      {stats && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Video Status
          </h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent-500" />
                Completed
              </span>
              <span className="font-medium text-gray-700">
                {stats.completed}/{totalLessons}
              </span>
            </div>
            {stats.generating > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-500" />
                  Generating
                </span>
                <span className="font-medium text-gray-700">
                  {stats.generating}
                </span>
              </div>
            )}
            {stats.review > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  In Review
                </span>
                <span className="font-medium text-gray-700">
                  {stats.review}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                No Video
              </span>
              <span className="font-medium text-gray-700">
                {stats.noVideo}
              </span>
            </div>
          </div>

          {stats.noVideo > 0 && onBatchGenerate && (
            <Button
              size="sm"
              onClick={onBatchGenerate}
              className="w-full gap-1.5 bg-brand-500 text-xs hover:bg-brand-600"
            >
              Generate All Videos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
