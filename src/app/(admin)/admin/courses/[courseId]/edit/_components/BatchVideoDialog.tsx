"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfHeaders } from "@/lib/utils/csrf";

interface LessonItem {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  contentType: string;
  latestJobStatus: string | null;
}

interface Props {
  courseId: string;
  open: boolean;
  onClose: () => void;
}

export default function BatchVideoDialog({ courseId, open, onClose }: Props) {
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    batchId: string;
    jobIds: string[];
  } | null>(null);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/lessons`);
      const json = await res.json();
      if (json.data) {
        const items: LessonItem[] = json.data;
        setLessons(items);
        // Pre-select lessons without completed video
        const noVideoIds = new Set(
          items
            .filter(
              (l) =>
                !l.latestJobStatus ||
                l.latestJobStatus === "FAILED" ||
                l.latestJobStatus === "CANCELLED"
            )
            .map((l) => l.lessonId)
        );
        setSelectedIds(noVideoIds);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (open) {
      fetchLessons();
      setResult(null);
    }
  }, [open, fetchLessons]);

  function toggleLesson(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/video-batch`, {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          lessonIds: Array.from(selectedIds),
        }),
      });
      const json = await res.json();
      if (json.data) {
        setResult(json.data);
      }
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Batch Video Generation
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : result ? (
            <div className="space-y-3 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-100">
                <Check className="h-6 w-6 text-accent-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {result.jobIds.length} video jobs created
              </p>
              <p className="text-xs text-gray-500">
                Batch ID: {result.batchId}
              </p>
              <p className="text-xs text-gray-400">
                Jobs are in DRAFT status. Open Video Studio to generate scripts
                and start rendering.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Select lessons to generate videos for. Course video settings
                (avatar, voice, speaker) will be inherited.
              </p>
              <div className="mt-3 space-y-1">
                {lessons.map((l) => {
                  const hasVideo =
                    l.latestJobStatus &&
                    l.latestJobStatus !== "FAILED" &&
                    l.latestJobStatus !== "CANCELLED";
                  return (
                    <label
                      key={l.lessonId}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        selectedIds.has(l.lessonId)
                          ? "border-brand-300 bg-brand-50/50"
                          : "border-gray-100 hover:bg-gray-50"
                      } ${hasVideo ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(l.lessonId)}
                        onChange={() => toggleLesson(l.lessonId)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {l.lessonTitle}
                        </p>
                        <p className="text-xs text-gray-400">
                          {l.moduleTitle}
                          {l.latestJobStatus && (
                            <span className="ml-2">
                              ({l.latestJobStatus.replace(/_/g, " ")})
                            </span>
                          )}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-400">
            {result
              ? ""
              : `${selectedIds.size} lesson(s) selected`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              {result ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || submitting}
                className="gap-1.5 bg-brand-500 hover:bg-brand-600"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {submitting
                  ? "Creating..."
                  : `Generate ${selectedIds.size} Videos`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
