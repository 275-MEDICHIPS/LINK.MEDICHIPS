"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Send,
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
  Loader2,
  BookOpen,
  Layers,
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
import CourseThumbnailEditor from "./_components/CourseThumbnailEditor";

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
  thumbnailUrl: string | null;
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
    <div className="space-y-3">
      <div>
        <label htmlFor="course-title" className="mb-1 block text-xs font-medium text-gray-500">
          Title
        </label>
        <Input
          id="course-title"
          value={course.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="h-9 text-sm"
        />
      </div>
      <div>
        <label htmlFor="course-desc" className="mb-1 block text-xs font-medium text-gray-500">
          Description
        </label>
        <textarea
          id="course-desc"
          value={course.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          placeholder="Brief description of the course..."
          className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="risk-level" className="mb-1 block text-xs font-medium text-gray-500">
            Risk Level
          </label>
          <select
            id="risk-level"
            value={course.riskLevel}
            onChange={(e) => onChange({ riskLevel: e.target.value as CourseData["riskLevel"] })}
            className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          >
            <option value="L1">L1 - Low</option>
            <option value="L2">L2 - Medium</option>
            <option value="L3">L3 - High</option>
          </select>
        </div>
        <div>
          <label htmlFor="language" className="mb-1 block text-xs font-medium text-gray-500">
            Language
          </label>
          <select
            id="language"
            value={course.language}
            onChange={(e) => onChange({ language: e.target.value })}
            className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm"
          >
            <option value="en">English</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
            <option value="sw">Swahili</option>
            <option value="am">Amharic</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ModuleTree({
  modules,
  selectedLessonId,
  onSelectLesson,
  videoStatus,
  courseId,
  courseLanguage,
  onRefresh,
}: {
  modules: Module[];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  videoStatus: Map<string, string>;
  courseId: string;
  courseLanguage: string;
  onRefresh: () => void;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<"TEXT" | "VIDEO" | "QUIZ">("TEXT");

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      await fetch(`/api/v1/courses/${courseId}/modules`, {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          locale: courseLanguage,
          title: newModuleTitle.trim(),
        }),
      });
      setNewModuleTitle("");
      setAddingModule(false);
      onRefresh();
    } catch {
      // Handle error
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;
    try {
      await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          locale: courseLanguage,
          title: newLessonTitle.trim(),
          contentType: newLessonType,
          body: {},
        }),
      });
      setNewLessonTitle("");
      setNewLessonType("TEXT");
      setAddingLessonFor(null);
      onRefresh();
    } catch {
      // Handle error
    }
  };

  if (modules.length === 0 && !addingModule) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
        <Layers className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">No modules yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Create your first module to start adding lessons
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => setAddingModule(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Module
        </Button>
      </div>
    );
  }

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
            <span className="ml-auto text-xs text-gray-300">{mod.lessons.length}</span>
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

              {/* Add Lesson inline form */}
              {addingLessonFor === mod.id ? (
                <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/30 p-2">
                  <Input
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Lesson title..."
                    className="h-8 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddLesson(mod.id);
                      if (e.key === "Escape") setAddingLessonFor(null);
                    }}
                  />
                  <div className="flex gap-1">
                    {(["TEXT", "VIDEO", "QUIZ"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNewLessonType(t)}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                          newLessonType === t
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAddingLessonFor(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddLesson(mod.id)}
                      disabled={!newLessonTitle.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingLessonFor(mod.id);
                    setNewLessonTitle("");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                >
                  <Plus className="h-3 w-3" />
                  Add Lesson
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Module inline form */}
      {addingModule ? (
        <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/30 p-2">
          <Input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="Module title..."
            className="h-8 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddModule();
              if (e.key === "Escape") setAddingModule(false);
            }}
          />
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAddingModule(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddModule}
              disabled={!newModuleTitle.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingModule(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          <Plus className="h-4 w-4" />
          Add Module
        </button>
      )}
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
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideoSettings, setShowVideoSettings] = useState(false);

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
        thumbnailUrl: raw.thumbnailUrl || null,
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

  const totalLessons = course?.modules.reduce((sum, m) => sum + m.lessons.length, 0) ?? 0;

  const handleCourseUpdate = (updates: Partial<CourseData>) => {
    setCourse((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleSave = async () => {
    if (!course) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: "PATCH",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          riskLevel: course.riskLevel,
          locale: course.language,
          title: course.title,
          description: course.description || null,
        }),
      });
      setSaveStatus(res.ok ? "saved" : "error");
      if (res.ok) {
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!course) return;
    try {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: "PATCH",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "IN_REVIEW" }),
      });
      if (res.ok) {
        handleCourseUpdate({ status: "review" });
      }
    } catch {
      // Handle error
    }
  };

  const handlePublish = async () => {
    if (!course) return;
    try {
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        method: "PATCH",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ publish: true }),
      });
      if (res.ok) {
        handleCourseUpdate({ status: "published" });
      }
    } catch {
      // Handle error
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

  const saveButtonText = saving ? "Saving..." : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error" : "Save Draft";

  return (
    <div className="-m-4 min-w-0 lg:-m-6 lg:flex lg:h-[calc(100vh-3.5rem)] lg:flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/admin/courses"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Back to courses"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-gray-900">{course.title}</h1>
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-500">
                {course.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {course.modules.length} modules · {totalLessons} lessons · Risk {course.riskLevel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className={saveStatus === "saved" ? "border-accent-300 text-accent-600" : saveStatus === "error" ? "border-red-300 text-red-600" : ""}
          >
            <Save className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{saveButtonText}</span>
          </Button>
          {/* Status badge */}
          <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:flex ${
            course.status === "published"
              ? "bg-accent-50 text-accent-700"
              : course.status === "review"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-600"
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              course.status === "published"
                ? "bg-accent-500"
                : course.status === "review"
                  ? "bg-amber-500"
                  : "bg-gray-400"
            }`} />
            {course.status === "published" ? "Live" : course.status === "review" ? "Review" : "Draft"}
          </span>
          {/* Action button */}
          {course.status === "draft" && (
            <Button size="sm" variant="outline" onClick={handleSubmitForReview}>
              <Send className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Submit</span>
            </Button>
          )}
          {course.status === "review" && (
            <Button size="sm" onClick={handlePublish}>
              <Send className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Publish</span>
            </Button>
          )}
        </div>
      </div>

      {/* ===== Mobile Layout: stacked sections ===== */}
      <div className="space-y-4 p-4 pb-24 lg:hidden">
        {/* Thumbnail */}
        <CourseThumbnailEditor
          courseId={courseId}
          courseTitle={course.title}
          thumbnailUrl={course.thumbnailUrl}
          onThumbnailChange={(url) => handleCourseUpdate({ thumbnailUrl: url })}
        />

        {/* Course Details */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Course Details
          </h2>
          <MetadataPanel course={course} onChange={handleCourseUpdate} />
        </div>

        {/* Video Settings - Collapsible */}
        <div>
          <button
            onClick={() => setShowVideoSettings(!showVideoSettings)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Video Settings
            </h2>
            <ChevronDown
              className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                showVideoSettings ? "" : "-rotate-90"
              }`}
            />
          </button>
          {showVideoSettings && (
            <div className="mt-3">
              <CourseVideoSettingsPanel
                courseId={courseId}
                onBatchGenerate={() => setShowBatchDialog(true)}
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Structure (Module Tree) */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Structure
          </h2>
          <ModuleTree
            modules={course.modules}
            selectedLessonId={selectedLessonId}
            onSelectLesson={setSelectedLessonId}
            videoStatus={videoStatus}
            courseId={courseId}
            courseLanguage={course.language}
            onRefresh={fetchCourse}
          />
        </div>

        {/* Lesson Editor */}
        {selectedLesson && (
          <>
            <div className="border-t border-gray-100" />
            <LessonEditor
              key={selectedLesson.id}
              lesson={selectedLesson}
              courseId={courseId}
            />
          </>
        )}
      </div>

      {/* ===== Desktop Layout: 3-column ===== */}
      <div className="hidden flex-1 overflow-hidden lg:flex">
        {/* Left: Metadata + Video Settings */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-4">
          <CourseThumbnailEditor
            courseId={courseId}
            courseTitle={course.title}
            thumbnailUrl={course.thumbnailUrl}
            onThumbnailChange={(url) => handleCourseUpdate({ thumbnailUrl: url })}
          />

          <div className="my-4 border-t border-gray-100" />

          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            Course Details
          </h2>
          <MetadataPanel course={course} onChange={handleCourseUpdate} />

          <div className="my-4 border-t border-gray-100" />

          {/* Video Settings - Collapsible */}
          <button
            onClick={() => setShowVideoSettings(!showVideoSettings)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Video Settings
            </h2>
            <ChevronDown
              className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                showVideoSettings ? "" : "-rotate-90"
              }`}
            />
          </button>
          {showVideoSettings && (
            <div className="mt-3">
              <CourseVideoSettingsPanel
                courseId={courseId}
                onBatchGenerate={() => setShowBatchDialog(true)}
              />
            </div>
          )}
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
            courseId={courseId}
            courseLanguage={course.language}
            onRefresh={fetchCourse}
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
                {totalLessons === 0 ? (
                  <>
                    <BookOpen className="mx-auto h-12 w-12 text-gray-200" />
                    <p className="mt-3 text-sm font-medium text-gray-500">
                      Start building your course
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-gray-400">
                      Add a module in the Structure panel, then create lessons within it.
                      Each lesson can be text, video, or quiz content.
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="mx-auto h-12 w-12 text-gray-200" />
                    <p className="mt-3 text-sm font-medium text-gray-500">
                      Select a lesson to edit
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Choose from the structure panel on the left
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
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
