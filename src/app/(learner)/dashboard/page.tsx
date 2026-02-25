"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Flame,
  Play,
  ChevronRight,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  CheckCircle2,
  Loader2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CelebrationModal } from "@/components/gamification/celebration-modal";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorInfo {
  name: string;
  avatarUrl: string | null;
  creatorTitle: string | null;
}

interface DashboardData {
  user: {
    name: string;
    avatarUrl: string | null;
  };
  totalXp: number;
  level: number;
  streak: {
    currentStreak: number;
  };
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle: string;
    moduleId: string;
    progressPct: number;
    thumbnailUrl: string | null;
    moduleIndex: number;
    lessonIndex: number;
    durationMin: number | null;
    lastStudiedAt: string;
    creator: CreatorInfo | null;
  } | null;
  dailyGoal: {
    targetMin: number;
    completedMin: number;
    lessonsToday: number;
  };
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    checklistTotal: number;
    checklistDone: number;
  }>;
  recommendedCourses: Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    riskLevel: string;
    videoCount: number;
    creator: CreatorInfo | null;
  }>;
}

interface LessonCompletedData {
  lessonTitle: string;
  xpEarned: number;
  nextLessonId: string | null;
  nextModuleId: string | null;
  courseId: string;
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

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading dashboard">
      <SkeletonBlock className="aspect-video w-full rounded-2xl" />
      <SkeletonBlock className="h-8 w-full rounded-xl" />
      <SkeletonBlock className="h-6 w-3/4 rounded-lg" />
      <div className="flex gap-3">
        <SkeletonBlock className="h-32 w-40 rounded-xl" />
        <SkeletonBlock className="h-32 w-40 rounded-xl" />
        <SkeletonBlock className="h-32 w-40 rounded-xl" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Category map for grouping ────────────────────────────────────────────────

function groupCoursesByCategory(
  courses: DashboardData["recommendedCourses"]
): Record<string, DashboardData["recommendedCourses"]> {
  const groups: Record<string, DashboardData["recommendedCourses"]> = {};
  for (const course of courses) {
    const category = course.creator?.creatorTitle ?? "기타";
    if (!groups[category]) groups[category] = [];
    groups[category].push(course);
  }
  return groups;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function LearnerDashboard() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Celebration modal state
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationData, setCelebrationData] =
    useState<LessonCompletedData | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/learner/dashboard");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load dashboard (${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull-to-refresh
  const { isRefreshing, pullDistance, handlers } = usePullToRefresh(
    fetchDashboard
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Check sessionStorage for lesson completion celebration
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lessonCompleted");
      if (raw) {
        sessionStorage.removeItem("lessonCompleted");
        const parsed: LessonCompletedData = JSON.parse(raw);
        setCelebrationData(parsed);
        setCelebrationOpen(true);
      }
    } catch {
      // sessionStorage unavailable or bad data
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-gray-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchDashboard}>
          {tc("tryAgain")}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Daily goal
  const goalPct = Math.min(
    Math.round((data.dailyGoal.completedMin / data.dailyGoal.targetMin) * 100),
    100
  );
  const goalAchieved = goalPct >= 100;

  // Group recommended courses by category
  const categoryGroups = groupCoursesByCategory(data.recommendedCourses);

  return (
    <div
      className="space-y-4 pb-4"
      {...handlers}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ height: `${pullDistance}px` }}
        >
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          ) : (
            <div
              className="h-5 w-5 rounded-full border-2 border-brand-300 border-t-brand-500 transition-transform"
              style={{
                transform: `rotate(${(pullDistance / 50) * 360}deg)`,
              }}
            />
          )}
        </div>
      )}

      {/* ─── Hero Video Card ─── */}
      {data.continueLearning ? (
        <Link
          href={`/courses/${data.continueLearning.courseId}/modules/${data.continueLearning.moduleId}/lessons/${data.continueLearning.lessonId}`}
          className="group relative block overflow-hidden rounded-2xl bg-gray-900"
        >
          {/* 16:9 thumbnail */}
          <div className="relative aspect-video w-full">
            {data.continueLearning.thumbnailUrl ? (
              <img
                src={data.continueLearning.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <Video className="h-12 w-12 text-gray-600" aria-hidden="true" />
              </div>
            )}

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 text-gray-900" aria-hidden="true" />
              </div>
            </div>

            {/* Bottom gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
              {/* Creator badge */}
              {data.continueLearning.creator && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  {data.continueLearning.creator.avatarUrl ? (
                    <img
                      src={data.continueLearning.creator.avatarUrl}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover ring-1 ring-white/30"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold text-white">
                      {data.continueLearning.creator.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-[11px] font-medium text-white/80">
                    {data.continueLearning.creator.name}
                  </span>
                  {data.continueLearning.creator.creatorTitle && (
                    <span className="text-[10px] text-white/50">
                      {data.continueLearning.creator.creatorTitle}
                    </span>
                  )}
                </div>
              )}

              {/* Course title */}
              <h2 className="text-base font-bold text-white leading-tight">
                {data.continueLearning.courseTitle}
              </h2>
              <p className="mt-0.5 text-xs text-white/60">
                {data.continueLearning.lessonTitle}
              </p>

              {/* Progress bar */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all duration-500"
                  style={{ width: `${data.continueLearning.progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-white/50">
                {Math.round(data.continueLearning.progressPct)}% {t("completed")}
              </p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100">
          <div className="text-center px-6">
            <Video className="mx-auto h-10 w-10 text-brand-300" aria-hidden="true" />
            <p className="mt-2 text-sm text-gray-500">
              {t("noCourses")}{" "}
              <Link
                href="/courses"
                className="font-medium text-brand-500 hover:underline"
              >
                {t("browseCourses")}
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ─── Quick Stats (one line) ─── */}
      <div className="flex items-center justify-around rounded-xl bg-gray-50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
          <span className="text-sm font-bold text-gray-900">
            {data.streak.currentStreak}
          </span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-brand-500" aria-hidden="true" />
          <span className="text-sm font-bold text-gray-900">
            {data.totalXp.toLocaleString()}
          </span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <span className="text-sm font-bold text-gray-900">
          Lv.{data.level}
        </span>
      </div>

      {/* ─── Daily Goal (compact one line) ─── */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-2.5",
          goalAchieved ? "bg-accent-50" : "bg-white border border-gray-100"
        )}
      >
        {/* Mini progress ring */}
        <div className="relative h-8 w-8 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-gray-100"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className={goalAchieved ? "stroke-accent-500" : "stroke-brand-500"}
              strokeWidth="3"
              strokeDasharray={`${goalPct * 0.942} 100`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">
              {data.dailyGoal.completedMin}/{data.dailyGoal.targetMin}{t("min")}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {goalAchieved ? (
              <span className="flex items-center gap-1 text-accent-600">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("goalAchieved")}
              </span>
            ) : (
              t("lessonsToday", { count: data.dailyGoal.lessonsToday })
            )}
          </span>
        </div>
      </div>

      {/* ─── Category-based horizontal scroll sections ─── */}
      {Object.entries(categoryGroups).map(([category, courses]) => (
        <section key={category}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{category}</h3>
            <Link
              href="/courses"
              className="flex items-center text-xs text-gray-400 hover:text-brand-500"
            >
              {tc("viewAll")}
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group flex-shrink-0 snap-start"
                style={{ width: "160px" }}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Video className="h-6 w-6 text-gray-300" aria-hidden="true" />
                    </div>
                  )}
                  {/* Creator overlay */}
                  {course.creator && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                      {course.creator.avatarUrl ? (
                        <img
                          src={course.creator.avatarUrl}
                          alt=""
                          className="h-3.5 w-3.5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/30 text-[7px] font-bold text-white">
                          {course.creator.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-[9px] font-medium text-white">
                        {course.creator.name}
                      </span>
                    </div>
                  )}
                  {/* Video count badge */}
                  {course.videoCount > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                      <Video className="h-2.5 w-2.5" aria-hidden="true" />
                      {course.videoCount}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-1 text-xs font-medium text-gray-900">
                  {course.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* ─── Tasks (max 2, compact) ─── */}
      {data.pendingTasks.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("todayTasks")}
            </h3>
            <Link
              href="/tasks"
              className="flex items-center text-xs text-gray-400 hover:text-brand-500"
            >
              {tc("viewAll")}
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {data.pendingTasks.map((task) => (
              <Link
                key={task.id}
                href="/tasks"
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2 transition-colors hover:bg-gray-50"
              >
                <div
                  className={cn(
                    "h-2 w-2 flex-shrink-0 rounded-full",
                    task.status === "IN_PROGRESS"
                      ? "bg-blue-400"
                      : "bg-gray-300"
                  )}
                />
                <p className="flex-1 truncate text-xs font-medium text-gray-900">
                  {task.title}
                </p>
                {task.checklistTotal > 0 && (
                  <span className="text-[10px] text-gray-400">
                    {task.checklistDone}/{task.checklistTotal}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Online Status ─── */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
          isOnline
            ? "bg-accent-50 text-accent-700"
            : "bg-amber-50 text-amber-700"
        )}
        role="status"
        aria-live="polite"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
            {tc("allDataSynced")}
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            {tc("offlineChangesWillSync")}
          </>
        )}
      </div>

      {/* Celebration Modal */}
      <CelebrationModal
        open={celebrationOpen}
        onOpenChange={(open) => {
          setCelebrationOpen(open);
          if (!open && celebrationData?.nextLessonId && celebrationData.nextModuleId) {
            router.push(
              `/courses/${celebrationData.courseId}/modules/${celebrationData.nextModuleId}/lessons/${celebrationData.nextLessonId}`
            );
          }
        }}
        title={celebrationData?.lessonTitle ?? "Lesson Complete!"}
        description="Great job completing this lesson!"
        xpEarned={celebrationData?.xpEarned}
      />
    </div>
  );
}
