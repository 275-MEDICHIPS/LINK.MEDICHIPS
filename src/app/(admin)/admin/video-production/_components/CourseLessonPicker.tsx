"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2, Info } from "lucide-react";

interface CourseOption {
  id: string;
  title: string;
  riskLevel: string;
}

interface LessonOption {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  contentType: string;
  latestJobStatus: string | null;
}

interface VideoSettings {
  avatarId: string | null;
  voicePresetId: string | null;
  speakerName: string | null;
  visualStyle: string | null;
  targetLocale: string;
}

interface Props {
  courseId: string;
  lessonId: string;
  onCourseChange: (courseId: string) => void;
  onLessonChange: (lessonId: string) => void;
  onSettingsLoaded?: (settings: VideoSettings) => void;
}

export default function CourseLessonPicker({
  courseId,
  lessonId,
  onCourseChange,
  onLessonChange,
  onSettingsLoaded,
}: Props) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch("/api/v1/courses?pageSize=100");
      const json = await res.json();
      if (json.data) {
        setCourses(
          json.data.map(
            (c: { id: string; translations: { title: string }[]; riskLevel: string }) => ({
              id: c.id,
              title: c.translations?.[0]?.title || "Untitled",
              riskLevel: c.riskLevel,
            })
          )
        );
      }
    } catch {
      // Silent
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const fetchLessons = useCallback(async (cId: string) => {
    if (!cId) {
      setLessons([]);
      return;
    }
    setLoadingLessons(true);
    try {
      const [lessonsRes, settingsRes] = await Promise.all([
        fetch(`/api/v1/courses/${cId}/lessons`),
        fetch(`/api/v1/courses/${cId}/video-settings`),
      ]);
      const lessonsJson = await lessonsRes.json();
      const settingsJson = await settingsRes.json();

      if (lessonsJson.data) setLessons(lessonsJson.data);
      if (settingsJson.data) {
        const s: VideoSettings = {
          avatarId: settingsJson.data.avatarId,
          voicePresetId: settingsJson.data.voicePresetId,
          speakerName: settingsJson.data.speakerName,
          visualStyle: settingsJson.data.visualStyle,
          targetLocale: settingsJson.data.targetLocale || "en",
        };
        setSettings(s);
        onSettingsLoaded?.(s);
      } else {
        setSettings(null);
      }
    } catch {
      // Silent
    } finally {
      setLoadingLessons(false);
    }
  }, [onSettingsLoaded]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (courseId) {
      fetchLessons(courseId);
    }
  }, [courseId, fetchLessons]);

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <BookOpen className="h-4 w-4" />
        Link to Course (optional)
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Course
          </label>
          {loadingCourses ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading courses...
            </div>
          ) : (
            <select
              value={courseId}
              onChange={(e) => {
                onCourseChange(e.target.value);
                onLessonChange("");
              }}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">No course selected</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.riskLevel})
                </option>
              ))}
            </select>
          )}
        </div>

        {courseId && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Lesson
            </label>
            {loadingLessons ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading lessons...
              </div>
            ) : (
              <select
                value={lessonId}
                onChange={(e) => onLessonChange(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">No lesson selected</option>
                {lessons.map((l) => (
                  <option key={l.lessonId} value={l.lessonId}>
                    [{l.moduleTitle}] {l.lessonTitle}
                    {l.latestJobStatus
                      ? ` (${l.latestJobStatus.replace(/_/g, " ")})`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {settings && courseId && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <Info className="h-3.5 w-3.5" />
              Course settings will be inherited
            </p>
            <div className="mt-2 space-y-1 text-xs text-blue-600">
              {settings.speakerName && (
                <p>Speaker: {settings.speakerName}</p>
              )}
              {settings.targetLocale && (
                <p>Locale: {settings.targetLocale}</p>
              )}
              {settings.visualStyle && (
                <p>Style: {settings.visualStyle}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
