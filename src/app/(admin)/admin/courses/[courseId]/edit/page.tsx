"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Send,
  Globe,
  ChevronRight,
  GripVertical,
  Plus,
  Video,
  FileText,
  HelpCircle,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { csrfHeaders } from "@/lib/utils/csrf";
import CourseVideoSettingsPanel from "./_components/CourseVideoSettingsPanel";
import LessonVideoSection from "./_components/LessonVideoSection";
import BatchVideoDialog from "./_components/BatchVideoDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContentType = "video" | "text" | "quiz";
type LessonStatus = "draft" | "complete" | "needs_review";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface LessonTranslation {
  locale: string;
  title: string;
  description?: string;
}

interface LatestVideoJob {
  id: string;
  status: string;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
}

interface Lesson {
  id: string;
  title: string;
  contentType: ContentType;
  status: LessonStatus;
  content: string;
  videoUrl?: string;
  quizQuestions?: QuizQuestion[];
  translations: { lang: string; status: "pending" | "in_progress" | "done" }[];
  latestVideoJob?: LatestVideoJob;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  specialty: string;
  riskLevel: "L1" | "L2" | "L3";
  language: string;
  status: "draft" | "review" | "published";
  modules: Module[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
};

const contentTypeLabels: Record<ContentType, string> = {
  video: "Video Lesson",
  text: "Text Content",
  quiz: "Quiz / Assessment",
};

const lessonStatusConfig: Record<LessonStatus, { icon: React.ElementType; color: string }> = {
  draft: { icon: Clock, color: "text-gray-400" },
  complete: { icon: CheckCircle2, color: "text-accent-500" },
  needs_review: { icon: AlertCircle, color: "text-amber-500" },
};

const translationStatusColors: Record<string, string> = {
  pending: "bg-gray-200",
  in_progress: "bg-amber-400",
  done: "bg-accent-500",
};

// Video status badge colors for module tree
const VIDEO_STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-accent-500",
  REVIEW: "bg-amber-500",
  SCRIPT_REVIEW: "bg-amber-500",
  RENDERING: "bg-brand-500",
  QUEUED: "bg-brand-500",
  SCRIPT_GENERATING: "bg-brand-500",
  FACE_SWAPPING: "bg-brand-500",
  POST_PROCESSING: "bg-brand-500",
  DRAFT: "bg-gray-300",
  FAILED: "bg-red-500",
};

// Map API status to our local status
function mapCourseStatus(status: string): "draft" | "review" | "published" {
  switch (status) {
    case "PUBLISHED":
      return "published";
    case "IN_REVIEW":
    case "APPROVED":
      return "review";
    default:
      return "draft";
  }
}

// Map API content type to local
function mapContentType(ct: string): ContentType {
  switch (ct) {
    case "VIDEO":
      return "video";
    case "QUIZ":
      return "quiz";
    default:
      return "text";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetadataPanel({
  course,
  onChange,
}: {
  course: CourseData;
  onChange: (updates: Partial<CourseData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="course-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Title
        </label>
        <Input
          id="course-title"
          value={course.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="course-desc" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Description
        </label>
        <textarea
          id="course-desc"
          value={course.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={4}
          className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>
      <div>
        <label htmlFor="course-specialty" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Specialty
        </label>
        <Input
          id="course-specialty"
          value={course.specialty}
          onChange={(e) => onChange({ specialty: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="risk-level" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Risk Level
        </label>
        <select
          id="risk-level"
          value={course.riskLevel}
          onChange={(e) => onChange({ riskLevel: e.target.value as CourseData["riskLevel"] })}
          className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <option value="L1">L1 - Low Risk</option>
          <option value="L2">L2 - Medium Risk</option>
          <option value="L3">L3 - High Risk</option>
        </select>
      </div>
      <div>
        <label htmlFor="language" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Primary Language
        </label>
        <select
          id="language"
          value={course.language}
          onChange={(e) => onChange({ language: e.target.value })}
          className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <option value="en">English</option>
          <option value="ko">Korean</option>
          <option value="fr">French</option>
          <option value="sw">Swahili</option>
          <option value="am">Amharic</option>
        </select>
      </div>
    </div>
  );
}

function ModuleTree({
  modules,
  selectedLessonId,
  onSelectLesson,
  videoStatus,
}: {
  modules: Module[];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  videoStatus: Map<string, string>;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {modules.map((mod, modIdx) => (
        <div key={mod.id}>
          <button
            onClick={() => toggleModule(mod.id)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-300" />
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
                expandedModules.has(mod.id) ? "" : "-rotate-90"
              }`}
            />
            <span className="mr-1 text-xs font-bold text-gray-400">M{modIdx + 1}</span>
            <span className="truncate">{mod.title}</span>
          </button>

          {expandedModules.has(mod.id) && (
            <div className="ml-5 space-y-0.5 border-l border-gray-100 pl-3">
              {mod.lessons.map((lesson) => {
                const StatusIcon = lessonStatusConfig[lesson.status].icon;
                const ContentIcon = contentTypeIcons[lesson.contentType];
                const isSelected = selectedLessonId === lesson.id;
                const videoStat = videoStatus.get(lesson.id);
                const videoBadgeColor = videoStat
                  ? VIDEO_STATUS_BADGE[videoStat] || "bg-gray-300"
                  : null;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => onSelectLesson(lesson.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-50 font-medium text-brand-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-gray-200" />
                    <ContentIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="truncate">{lesson.title}</span>
                    <div className="ml-auto flex items-center gap-1">
                      {videoBadgeColor && (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${videoBadgeColor}`}
                          title={`Video: ${videoStat}`}
                        />
                      )}
                      <StatusIcon
                        className={`h-3.5 w-3.5 shrink-0 ${lessonStatusConfig[lesson.status].color}`}
                      />
                    </div>
                  </button>
                );
              })}
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                <Plus className="h-3 w-3" />
                Add Lesson
              </button>
            </div>
          )}
        </div>
      ))}
      <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600">
        <Plus className="h-4 w-4" />
        Add Module
      </button>
    </div>
  );
}

function LessonEditor({
  lesson,
  courseId,
}: {
  lesson: Lesson;
  courseId: string;
}) {
  const [contentType, setContentType] = useState<ContentType>(lesson.contentType);
  const [content, setContent] = useState(lesson.content);
  const [questions, setQuestions] = useState<QuizQuestion[]>(lesson.quizQuestions || []);

  return (
    <div className="space-y-6">
      {/* Lesson title */}
      <div>
        <label htmlFor="lesson-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Lesson Title
        </label>
        <Input id="lesson-title" defaultValue={lesson.title} />
      </div>

      {/* Content type selector */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Content Type
        </p>
        <div className="flex gap-2">
          {(["text", "video", "quiz"] as const).map((type) => {
            const Icon = contentTypeIcons[type];
            return (
              <button
                key={type}
                onClick={() => setContentType(type)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  contentType === type
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {contentTypeLabels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      {contentType === "text" && (
        <div>
          <label htmlFor="lesson-content" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Content
          </label>
          <textarea
            id="lesson-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder="Write your lesson content here. Markdown is supported."
          />
        </div>
      )}

      {contentType === "video" && (
        <LessonVideoSection
          courseId={courseId}
          lessonId={lesson.id}
          latestJob={lesson.latestVideoJob}
        />
      )}

      {contentType === "quiz" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Quiz Questions
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setQuestions([
                  ...questions,
                  {
                    id: `q_${Date.now()}`,
                    question: "",
                    options: ["", "", "", ""],
                    correctIndex: 0,
                  },
                ])
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Question
            </Button>
          </div>
          <div className="space-y-4">
            {questions.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <HelpCircle className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No questions yet</p>
                <p className="text-xs text-gray-400">
                  Add questions to create an assessment for this lesson
                </p>
              </div>
            ) : (
              questions.map((q, qIdx) => (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                        Q{qIdx + 1}
                      </span>
                      <button
                        onClick={() =>
                          setQuestions(questions.filter((_, i) => i !== qIdx))
                        }
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                        setQuestions(updated);
                      }}
                      placeholder="Enter your question..."
                      className="mb-3"
                    />
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => {
                              const updated = [...questions];
                              updated[qIdx] = { ...updated[qIdx], correctIndex: optIdx };
                              setQuestions(updated);
                            }}
                            className="h-4 w-4 text-brand-600"
                            aria-label={`Mark option ${optIdx + 1} as correct`}
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const updated = [...questions];
                              const newOptions = [...updated[qIdx].options];
                              newOptions[optIdx] = e.target.value;
                              updated[qIdx] = { ...updated[qIdx], options: newOptions };
                              setQuestions(updated);
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Translation Status */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Translation Status
        </p>
        <div className="flex flex-wrap gap-2">
          {lesson.translations.map((t) => (
            <div
              key={t.lang}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5"
            >
              <span className="text-xs font-semibold uppercase text-gray-600">
                {t.lang}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${translationStatusColors[t.status]}`}
                title={t.status}
              />
              <span className="text-xs capitalize text-gray-400">{t.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CourseEditPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseData | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video status per lesson: lessonId -> latest job status
  const [videoStatus, setVideoStatus] = useState<Map<string, string>>(new Map());

  // Fetch course data from API
  const fetchCourse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/courses/${courseId}?locale=en`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load course");

      const raw = json.data;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modules: Module[] = (raw.modules || []).map((m: any) => ({
        id: m.id,
        title: m.translations?.[0]?.title || "Untitled Module",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lessons: (m.lessons || []).map((l: any) => ({
          id: l.id,
          title: l.translations?.[0]?.title || "Untitled Lesson",
          contentType: mapContentType(l.contentType),
          status: "draft" as LessonStatus,
          content: "",
          translations: [],
        })),
      }));

      const courseData: CourseData = {
        id: raw.id,
        title: raw.translations?.[0]?.title || "Untitled Course",
        description: raw.translations?.[0]?.description || "",
        specialty: raw.specialtyTags?.[0]?.specialty?.name || "",
        riskLevel: raw.riskLevel || "L1",
        language: raw.translations?.[0]?.locale || "en",
        status: mapCourseStatus(raw.status),
        modules,
      };

      setCourse(courseData);

      // Select first lesson if none selected
      if (!selectedLessonId && modules.length > 0 && modules[0].lessons.length > 0) {
        setSelectedLessonId(modules[0].lessons[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [courseId, selectedLessonId]);

  // Fetch video status for all lessons
  const fetchVideoStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/video-status`);
      const json = await res.json();
      if (json.data?.lessons) {
        const map = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.data.lessons.forEach((l: any) => {
          if (l.latestJob) {
            map.set(l.lessonId, l.latestJob.status);
          }
        });
        setVideoStatus(map);

        // Also update lesson latestVideoJob in course data
        if (course) {
          setCourse((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              modules: prev.modules.map((m) => ({
                ...m,
                lessons: m.lessons.map((lesson) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const statusLesson = json.data.lessons.find((sl: any) => sl.lessonId === lesson.id);
                  return {
                    ...lesson,
                    latestVideoJob: statusLesson?.latestJob || undefined,
                  };
                }),
              })),
            };
          });
        }
      }
    } catch {
      // Non-critical
    }
  }, [courseId, course]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  useEffect(() => {
    if (course) {
      fetchVideoStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, loading]);

  const selectedLesson = course?.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selectedLessonId);

  const handleCourseUpdate = (updates: Partial<CourseData>) => {
    setCourse((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleSave = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/courses/${courseId}`, {
        method: "PATCH",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          riskLevel: course.riskLevel,
        }),
      });
    } catch {
      // Handle error
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
          <p className="mt-3 text-sm text-gray-500">Loading course...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !course) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 text-sm text-red-600">{error || "Course not found"}</p>
          <Link href="/admin/courses">
            <Button variant="outline" size="sm" className="mt-4">
              Back to Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/courses"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Back to courses"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900">{course.title}</h1>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-500">
                {course.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {course.specialty ? `${course.specialty} · ` : ""}Risk {course.riskLevel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVersionHistory(!showVersionHistory)}
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            History
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          {course.status === "draft" && (
            <Button size="sm">
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Submit for Review
            </Button>
          )}
          {course.status === "review" && (
            <Button size="sm">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Metadata + Video Settings */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-4">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
            Course Details
          </h2>
          <MetadataPanel course={course} onChange={handleCourseUpdate} />

          {/* Divider */}
          <div className="my-5 border-t border-gray-100" />

          {/* Video Settings Panel */}
          <CourseVideoSettingsPanel
            courseId={courseId}
            onBatchGenerate={() => setShowBatchDialog(true)}
          />
        </div>

        {/* Center: Module Tree */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-gray-100 bg-gray-50/50 p-4">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
            Structure
          </h2>
          <ModuleTree
            modules={course.modules}
            selectedLessonId={selectedLessonId}
            onSelectLesson={setSelectedLessonId}
            videoStatus={videoStatus}
          />
        </div>

        {/* Right: Lesson Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedLesson ? (
            <LessonEditor
              key={selectedLesson.id}
              lesson={selectedLesson}
              courseId={courseId}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-200" />
                <p className="mt-3 text-sm font-medium text-gray-500">
                  Select a lesson to edit
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Choose from the structure panel on the left
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Version History Sidebar */}
        {showVersionHistory && (
          <div className="w-72 shrink-0 overflow-y-auto border-l border-gray-100 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Version History
              </h2>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close version history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Version history will be loaded from the API.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Batch Video Dialog */}
      <BatchVideoDialog
        courseId={courseId}
        open={showBatchDialog}
        onClose={() => {
          setShowBatchDialog(false);
          fetchVideoStatus();
        }}
      />
    </div>
  );
}
