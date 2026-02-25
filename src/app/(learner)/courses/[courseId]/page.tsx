"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Play,
  FileText,
  HelpCircle,
  Volume2,
  Layers,
  CheckCircle2,
  Lock,
  Clock,
  Video,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { csrfHeaders } from "@/lib/utils/csrf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorDetail {
  id: string;
  name: string;
  avatarUrl: string | null;
  creatorTitle: string | null;
  creatorBio: string | null;
  creatorField: string | null;
  courseCount: number;
  enrollmentCount: number;
}

interface LessonItem {
  id: string;
  orderIndex: number;
  contentType: "VIDEO" | "AUDIO" | "TEXT" | "QUIZ" | "MISSION" | "MIXED";
  durationMin: number | null;
  isRequired: boolean;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isCompleted: boolean;
  isUnlocked: boolean;
}

interface ModuleItem {
  id: string;
  orderIndex: number;
  title: string;
  description: string | null;
  lessons: LessonItem[];
  completedLessons: number;
  totalLessons: number;
}

interface CourseDetail {
  id: string;
  slug: string;
  riskLevel: "L1" | "L2" | "L3";
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  title: string;
  description: string | null;
  specialties: Array<{ id: string; name: string }>;
  creator: CreatorDetail | null;
  contentBreakdown: { videoCount: number; totalDurationMin: number };
  modules: ModuleItem[];
  progressPct: number;
  isEnrolled: boolean;
  continueLesson: {
    moduleId: string;
    lessonId: string;
  } | null;
}

// ─── Content Type Icon ────────────────────────────────────────────────────────

function ContentTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    VIDEO: <Play className={cn("h-4 w-4", className)} aria-hidden="true" />,
    AUDIO: <Volume2 className={cn("h-4 w-4", className)} aria-hidden="true" />,
    TEXT: <FileText className={cn("h-4 w-4", className)} aria-hidden="true" />,
    QUIZ: <HelpCircle className={cn("h-4 w-4", className)} aria-hidden="true" />,
    MISSION: <Layers className={cn("h-4 w-4", className)} aria-hidden="true" />,
    MIXED: <Layers className={cn("h-4 w-4", className)} aria-hidden="true" />,
  };
  return <>{iconMap[type] || <FileText className={cn("h-4 w-4", className)} aria-hidden="true" />}</>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading course details">
      <SkeletonBlock className="h-5 w-16" />
      <SkeletonBlock className="aspect-video w-full rounded-2xl" />
      <SkeletonBlock className="h-12 w-full rounded-xl" />
      <SkeletonBlock className="h-5 w-3/4" />
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-14 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────

function ModuleAccordion({
  module,
  courseId,
  isExpanded,
  onToggle,
}: {
  module: ModuleItem;
  courseId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const allCompleted = module.completedLessons === module.totalLessons && module.totalLessons > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50"
        aria-expanded={isExpanded}
      >
        <div
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
            allCompleted
              ? "bg-accent-100 text-accent-700"
              : "bg-brand-50 text-brand-600"
          )}
        >
          {allCompleted ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            module.orderIndex + 1
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {module.title}
          </h3>
          <p className="text-[10px] text-gray-400">
            {module.completedLessons}/{module.totalLessons}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isExpanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {/* Lesson List */}
      {isExpanded && (
        <ul className="border-t border-gray-50">
          {module.lessons.map((lesson) => (
            <li key={lesson.id}>
              {lesson.isUnlocked ? (
                <Link
                  href={`/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
                  className={cn(
                    "flex items-center gap-3 border-b border-gray-50 px-3 py-2.5 transition-colors last:border-b-0",
                    lesson.isCompleted
                      ? "bg-accent-50/50 hover:bg-accent-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                      lesson.isCompleted
                        ? "bg-accent-100 text-accent-600"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {lesson.isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : lesson.contentType === "VIDEO" || lesson.contentType === "MIXED" ? (
                      <Play className="ml-0.5 h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ContentTypeIcon type={lesson.contentType} className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "truncate text-sm",
                        lesson.isCompleted
                          ? "font-medium text-accent-700"
                          : "font-medium text-gray-900"
                      )}
                    >
                      {lesson.title}
                    </p>
                  </div>
                  {lesson.durationMin && (
                    <span className="text-[10px] text-gray-400">
                      {lesson.durationMin}m
                    </span>
                  )}
                </Link>
              ) : (
                <div className="flex items-center gap-3 border-b border-gray-50 px-3 py-2.5 opacity-40 last:border-b-0">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                    <Lock className="h-3 w-3" aria-hidden="true" />
                  </div>
                  <p className="flex-1 truncate text-sm font-medium text-gray-400">
                    {lesson.title}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );
  const [enrolling, setEnrolling] = useState(false);

  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/learner/courses/${params.courseId}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load course (${res.status})`);
      const json = await res.json();
      setCourse(json.data);

      // Auto-expand the first module with incomplete lessons
      const firstIncomplete = json.data.modules.find(
        (m: ModuleItem) => m.completedLessons < m.totalLessons
      );
      if (firstIncomplete) {
        setExpandedModules(new Set([firstIncomplete.id]));
      } else if (json.data.modules.length > 0) {
        setExpandedModules(new Set([json.data.modules[0].id]));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load course"
      );
    } finally {
      setLoading(false);
    }
  }, [params.courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleEnroll = async () => {
    if (enrolling) return;
    try {
      setEnrolling(true);
      const res = await fetch(`/api/v1/learner/courses/${params.courseId}/enroll`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error("Enrollment failed");
      await fetchCourse();
    } catch {
      // Allow retry
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <CourseDetailSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-gray-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchCourse}>
          {tc("tryAgain")}
        </Button>
      </div>
    );
  }

  if (!course) return null;

  // Find first video lesson thumbnail for preview
  const firstVideoLesson = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.contentType === "VIDEO" || l.contentType === "MIXED");

  const previewThumb =
    course.thumbnailUrl ||
    firstVideoLesson?.thumbnailUrl ||
    null;

  const { videoCount, totalDurationMin } = course.contentBreakdown;
  const hours = Math.floor(totalDurationMin / 60);
  const mins = totalDurationMin % 60;
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className="space-y-4 pb-24">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tc("back")}
      </button>

      {/* ─── Video Preview ─── */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-900">
        {previewThumb ? (
          <img
            src={previewThumb}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Video className="h-12 w-12 text-gray-600" aria-hidden="true" />
          </div>
        )}
        {/* Play button */}
        {course.isEnrolled && course.continueLesson && (
          <Link
            href={`/courses/${course.id}/modules/${course.continueLesson.moduleId}/lessons/${course.continueLesson.lessonId}`}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-110">
              <Play className="ml-1 h-6 w-6 text-gray-900" aria-hidden="true" />
            </div>
          </Link>
        )}
      </div>

      {/* ─── Creator Profile ─── */}
      {course.creator && (
        <div className="flex items-center gap-3">
          {course.creator.avatarUrl ? (
            <img
              src={course.creator.avatarUrl}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-600">
              {course.creator.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {course.creator.name}
            </p>
            {course.creator.creatorTitle && (
              <p className="text-xs text-gray-500">
                {course.creator.creatorTitle}
              </p>
            )}
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span>{t("courseCount", { count: course.creator.courseCount })}</span>
              <span className="flex items-center gap-0.5">
                <Users className="h-2.5 w-2.5" aria-hidden="true" />
                {course.creator.enrollmentCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Course Info Line ─── */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {videoCount > 0 && (
          <span className="flex items-center gap-1">
            <Video className="h-3.5 w-3.5" aria-hidden="true" />
            {videoCount}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {durationStr}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
            course.riskLevel === "L1" && "bg-green-100 text-green-700",
            course.riskLevel === "L2" && "bg-amber-100 text-amber-700",
            course.riskLevel === "L3" && "bg-red-100 text-red-700"
          )}
        >
          {course.riskLevel}
        </span>
      </div>

      {/* Course Title */}
      <h1 className="text-lg font-bold text-gray-900">{course.title}</h1>

      {course.description && (
        <p className="text-sm text-gray-500 leading-relaxed">
          {course.description}
        </p>
      )}

      {/* ─── Progress (enrolled only) ─── */}
      {course.isEnrolled && (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                course.progressPct >= 100
                  ? "bg-accent-500"
                  : "bg-brand-500"
              )}
              style={{ width: `${course.progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-brand-600">
            {Math.round(course.progressPct)}%
          </span>
        </div>
      )}

      {/* ─── Module List ─── */}
      <div className="space-y-2">
        {course.modules.map((module) => (
          <ModuleAccordion
            key={module.id}
            module={module}
            courseId={course.id}
            isExpanded={expandedModules.has(module.id)}
            onToggle={() => toggleModule(module.id)}
          />
        ))}
      </div>

      {/* ─── CTA Button ─── */}
      <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
        {course.isEnrolled && course.continueLesson ? (
          <Link
            href={`/courses/${course.id}/modules/${course.continueLesson.moduleId}/lessons/${course.continueLesson.lessonId}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-600"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {t("continueLearning")}
          </Link>
        ) : !course.isEnrolled ? (
          <Button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full rounded-xl py-6 text-sm font-semibold shadow-lg"
          >
            {enrolling ? tc("loading") : t("enrollInCourse")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
