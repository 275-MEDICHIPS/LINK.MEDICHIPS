"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonItem {
  id: string;
  orderIndex: number;
  contentType: "VIDEO" | "AUDIO" | "TEXT" | "QUIZ" | "MISSION" | "MIXED";
  durationMin: number | null;
  isRequired: boolean;
  title: string;
  description: string | null;
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
  instructorName: string | null;
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
    <div className="space-y-6" role="status" aria-label="Loading course details">
      <SkeletonBlock className="h-5 w-24" />
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-3/4" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-2/3" />
      </div>
      <SkeletonBlock className="h-3 w-full rounded-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-16 w-full rounded-xl" />
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
  const progressPct =
    module.totalLessons > 0
      ? Math.round((module.completedLessons / module.totalLessons) * 100)
      : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
        aria-expanded={isExpanded}
        aria-controls={`module-${module.id}-lessons`}
      >
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
            allCompleted
              ? "bg-accent-100 text-accent-700"
              : "bg-brand-50 text-brand-600"
          )}
        >
          {allCompleted ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            module.orderIndex + 1
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {module.title}
          </h3>
          <p className="text-[10px] text-gray-400">
            {module.completedLessons}/{module.totalLessons} lessons
            {module.description && ` - ${module.description}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-gray-400">
            {progressPct}%
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-400 transition-transform",
              isExpanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Module Progress Bar */}
      <div className="mx-4 mb-0 h-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            allCompleted ? "bg-accent-500" : "bg-brand-500"
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Lesson List */}
      {isExpanded && (
        <ul
          id={`module-${module.id}-lessons`}
          className="border-t border-gray-50"
          role="list"
        >
          {module.lessons.map((lesson) => (
            <li key={lesson.id} role="listitem">
              {lesson.isUnlocked ? (
                <Link
                  href={`/courses/${courseId}/modules/${module.id}/lessons/${lesson.id}`}
                  className={cn(
                    "flex items-center gap-3 border-b border-gray-50 px-4 py-3 transition-colors last:border-b-0",
                    lesson.isCompleted
                      ? "bg-accent-50/50 hover:bg-accent-50"
                      : "hover:bg-gray-50"
                  )}
                  aria-label={`${lesson.title}. ${lesson.contentType.toLowerCase()} lesson${lesson.durationMin ? `. ${lesson.durationMin} minutes` : ""}${lesson.isCompleted ? ". Completed" : ""}`}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                      lesson.isCompleted
                        ? "bg-accent-100 text-accent-600"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {lesson.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ContentTypeIcon type={lesson.contentType} />
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
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] capitalize text-gray-400">
                        {lesson.contentType.toLowerCase()}
                      </span>
                      {lesson.durationMin && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                          {lesson.durationMin}m
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 flex-shrink-0 text-gray-300"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <div
                  className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 opacity-50 last:border-b-0"
                  aria-label={`${lesson.title}. Locked. Complete previous lessons to unlock.`}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-300">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-400">
                      {lesson.title}
                    </p>
                    <span className="text-[10px] text-gray-300">Locked</span>
                  </div>
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
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set()
  );

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

  if (loading) return <CourseDetailSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-gray-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchCourse}>
          Try again
        </Button>
      </div>
    );
  }

  if (!course) return null;

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.totalLessons,
    0
  );
  const completedLessons = course.modules.reduce(
    (sum, m) => sum + m.completedLessons,
    0
  );

  return (
    <div className="space-y-5 pb-24">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label="Go back to courses"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      {/* Course Header */}
      <header className="space-y-3">
        <div className="flex items-start gap-2">
          <h1 className="flex-1 text-xl font-bold text-gray-900">
            {course.title}
          </h1>
          <span
            className={cn(
              "mt-1 flex-shrink-0 rounded px-2 py-0.5 text-xs font-semibold",
              course.riskLevel === "L1" && "bg-green-100 text-green-700",
              course.riskLevel === "L2" && "bg-amber-100 text-amber-700",
              course.riskLevel === "L3" && "bg-red-100 text-red-700"
            )}
          >
            {course.riskLevel}
          </span>
        </div>

        {course.description && (
          <p className="text-sm leading-relaxed text-gray-600">
            {course.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          {course.instructorName && (
            <span>By {course.instructorName}</span>
          )}
          {course.estimatedHours && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {course.estimatedHours}h
            </span>
          )}
          <span>
            {course.modules.length} module{course.modules.length !== 1 ? "s" : ""} / {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Specialty Tags */}
        {course.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.specialties.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-healthcare-purple/10 px-2 py-0.5 text-[10px] font-medium text-healthcare-purple"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Progress Overview */}
      {course.isEnrolled && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-900">Your Progress</span>
            <span className="font-semibold text-brand-600">
              {Math.round(course.progressPct)}%
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={Math.round(course.progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Course progress: ${Math.round(course.progressPct)}%`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                course.progressPct >= 100
                  ? "bg-accent-500"
                  : "bg-gradient-to-r from-brand-400 to-brand-600"
              )}
              style={{ width: `${course.progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">
            {completedLessons} of {totalLessons} lessons completed
          </p>
        </div>
      )}

      {/* Module List */}
      <section aria-labelledby="modules-heading">
        <h2
          id="modules-heading"
          className="mb-3 text-sm font-semibold text-gray-900"
        >
          Course Content
        </h2>
        <div className="space-y-3">
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
      </section>

      {/* Continue Learning Floating Button */}
      {course.isEnrolled && course.continueLesson && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
          <Link
            href={`/courses/${course.id}/modules/${course.continueLesson.moduleId}/lessons/${course.continueLesson.lessonId}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Continue Learning
          </Link>
        </div>
      )}

      {/* Enroll Button (if not enrolled) */}
      {!course.isEnrolled && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
          <Button className="w-full rounded-xl py-6 text-sm font-semibold shadow-lg">
            Enroll in Course
          </Button>
        </div>
      )}
    </div>
  );
}
