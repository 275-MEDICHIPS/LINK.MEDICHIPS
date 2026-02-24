"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Flame,
  Play,
  ChevronRight,
  Trophy,
  Wifi,
  WifiOff,
  BookOpen,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  user: {
    name: string;
    avatarUrl: string | null;
  };
  totalXp: number;
  level: {
    level: number;
    currentXp: number;
    nextLevelXp: number | null;
    progress: number;
  };
  streak: {
    currentStreak: number;
    longestStreak: number;
  };
  continueLearning: {
    courseId: string;
    courseTitle: string;
    lessonId: string;
    lessonTitle: string;
    moduleId: string;
    progressPct: number;
    thumbnailUrl: string | null;
  } | null;
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    checklistTotal: number;
    checklistDone: number;
  }>;
  weeklyProgress: number[];
  recentBadges: Array<{
    id: string;
    name: string;
    iconUrl: string;
    earnedAt: string;
  }>;
  recommendedCourse: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    moduleCount: number;
    riskLevel: string;
  } | null;
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

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
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-48" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-20 rounded-xl" />
        <SkeletonBlock className="h-20 rounded-xl" />
        <SkeletonBlock className="h-20 rounded-xl" />
      </div>
      <SkeletonBlock className="h-4 w-full rounded-full" />
      <SkeletonBlock className="h-32 rounded-xl" />
      <SkeletonBlock className="h-24 rounded-xl" />
      <SkeletonBlock className="h-24 rounded-xl" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Helper: Day labels ──────────────────────────────────────────────────────

function getWeekdayLabels(): string[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay();
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    labels.push(days[(today - i + 7) % 7]);
  }
  return labels;
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function LearnerDashboard() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

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

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("goodMorning") : hour < 17 ? t("goodAfternoon") : t("goodEvening");
  const weekLabels = getWeekdayLabels();
  const weekData = data.weeklyProgress.length === 7
    ? data.weeklyProgress
    : [0, 0, 0, 0, 0, 0, 0];
  const maxWeekVal = Math.max(...weekData, 1);

  const xpProgressPct = Math.round(data.level.progress * 100);

  return (
    <div className="space-y-6 pb-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            {greeting}, {data.user.name.split(" ")[0]}
            {data.streak.currentStreak > 0 && (
              <span
                className="flex items-center gap-0.5 text-sm font-semibold text-orange-500"
                aria-label={`${data.streak.currentStreak} day streak`}
              >
                <Flame className="h-4 w-4" aria-hidden="true" />
                {data.streak.currentStreak}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">{t("continueJourney")}</p>
        </div>
        {data.user.avatarUrl ? (
          <img
            src={data.user.avatarUrl}
            alt={`${data.user.name}'s avatar`}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600"
            aria-hidden="true"
          >
            {data.user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* XP Bar with Level */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
              {data.level.level}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{t("level", { level: data.level.level })}</p>
              <p className="text-sm font-bold text-gray-900">
                {data.totalXp.toLocaleString()} XP
              </p>
            </div>
          </div>
          {data.level.nextLevelXp && (
            <p className="text-xs text-gray-400">
              {t("xpToNextLevel", { xp: data.level.nextLevelXp.toLocaleString(), level: data.level.level + 1 })}
            </p>
          )}
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={xpProgressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`XP progress: ${xpProgressPct}%`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
            style={{ width: `${xpProgressPct}%` }}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-brand-50 p-3 text-center">
          <p className="text-xl font-bold text-brand-600">
            {data.totalXp.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-600">{t("xpEarned")}</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
            <p className="text-xl font-bold text-orange-600">
              {data.streak.currentStreak}
            </p>
          </div>
          <p className="text-[10px] text-gray-600">{t("dayStreak")}</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3 text-center">
          <p className="text-xl font-bold text-purple-600">
            Lv.{data.level.level}
          </p>
          <p className="text-[10px] text-gray-600">{t("currentLevel")}</p>
        </div>
      </div>

      {/* Continue Learning */}
      <section aria-labelledby="continue-learning-heading">
        <h2
          id="continue-learning-heading"
          className="mb-3 text-sm font-semibold text-gray-900"
        >
          {t("continueLearning")}
        </h2>
        {data.continueLearning ? (
          <Link
            href={`/courses/${data.continueLearning.courseId}/modules/${data.continueLearning.moduleId}/lessons/${data.continueLearning.lessonId}`}
            className="block rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex gap-3 p-4">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                {data.continueLearning.thumbnailUrl ? (
                  <img
                    src={data.continueLearning.thumbnailUrl}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <BookOpen className="h-6 w-6 text-brand-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">
                  {data.continueLearning.courseTitle}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {data.continueLearning.lessonTitle}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${data.continueLearning.progressPct}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">
                    {Math.round(data.continueLearning.progressPct)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500">
                  <Play className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">
              {t("noCourses")}{" "}
              <Link
                href="/courses"
                className="font-medium text-brand-500 hover:underline"
              >
                {t("browseCourses")}
              </Link>{" "}
              {t("toGetStarted")}
            </p>
          </div>
        )}
      </section>

      {/* Today's Tasks */}
      <section aria-labelledby="tasks-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="tasks-heading"
            className="text-sm font-semibold text-gray-900"
          >
            {t("todayTasks")}
          </h2>
          {data.pendingTasks.length > 0 && (
            <Link
              href="/tasks"
              className="flex items-center text-xs font-medium text-brand-500 hover:underline"
            >
              {tc("viewAll")}
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </div>
        {data.pendingTasks.length > 0 ? (
          <div className="space-y-2">
            {data.pendingTasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href="/tasks"
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                    task.status === "IN_PROGRESS"
                      ? "bg-blue-50"
                      : "bg-gray-50"
                  )}
                >
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      task.status === "IN_PROGRESS"
                        ? "bg-blue-400"
                        : "bg-gray-300"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-[10px] text-gray-400">
                      {t("due", {
                        date: new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                      })}
                    </p>
                  )}
                </div>
                {task.checklistTotal > 0 && (
                  <span className="text-xs font-medium text-gray-400">
                    {task.checklistDone}/{task.checklistTotal}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{t("noPendingTasks")}</p>
          </div>
        )}
      </section>

      {/* Weekly Progress */}
      <section aria-labelledby="weekly-progress-heading">
        <h2
          id="weekly-progress-heading"
          className="mb-3 text-sm font-semibold text-gray-900"
        >
          {t("weeklyProgress")}
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div
            className="flex items-end justify-between gap-1"
            style={{ height: "80px" }}
            role="img"
            aria-label={`Weekly progress chart: ${weekData.join(", ")} lessons completed over the last 7 days`}
          >
            {weekData.map((val, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative w-full flex justify-center" style={{ height: "60px" }}>
                  <div
                    className={cn(
                      "w-5 rounded-t-md transition-all duration-300",
                      val > 0
                        ? "bg-gradient-to-t from-brand-500 to-brand-300"
                        : "bg-gray-100"
                    )}
                    style={{
                      height: `${Math.max((val / maxWeekVal) * 100, 8)}%`,
                      position: "absolute",
                      bottom: 0,
                    }}
                  />
                </div>
                <span className="text-[9px] font-medium text-gray-400">
                  {weekLabels[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Achievements */}
      <section aria-labelledby="achievements-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="achievements-heading"
            className="text-sm font-semibold text-gray-900"
          >
            {t("recentAchievements")}
          </h2>
          <Link
            href="/achievements"
            className="flex items-center text-xs font-medium text-brand-500 hover:underline"
          >
            {tc("viewAll")}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        {data.recentBadges.length > 0 ? (
          <div
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
            role="list"
            aria-label="Recent badges earned"
          >
            {data.recentBadges.map((badge) => (
              <div
                key={badge.id}
                role="listitem"
                className="flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
                style={{ width: "80px" }}
              >
                <img
                  src={badge.iconUrl}
                  alt={badge.name}
                  className="h-10 w-10"
                  loading="lazy"
                />
                <span className="text-center text-[9px] font-medium text-gray-600 leading-tight">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
                <Trophy className="h-5 w-5 text-gray-300" aria-hidden="true" />
              </div>
              <p className="text-sm text-gray-500">
                {t("earnBadgesPrompt")}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Recommended Course */}
      {data.recommendedCourse && (
        <section aria-labelledby="recommended-heading">
          <h2
            id="recommended-heading"
            className="mb-3 text-sm font-semibold text-gray-900"
          >
            {t("recommendedForYou")}
          </h2>
          <Link
            href={`/courses/${data.recommendedCourse.id}`}
            className="block rounded-xl border border-gray-100 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100">
                <Star className="h-5 w-5 text-brand-500" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {data.recommendedCourse.title}
                  </p>
                  <span
                    className={cn(
                      "flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                      data.recommendedCourse.riskLevel === "L1" &&
                        "bg-green-100 text-green-700",
                      data.recommendedCourse.riskLevel === "L2" &&
                        "bg-amber-100 text-amber-700",
                      data.recommendedCourse.riskLevel === "L3" &&
                        "bg-red-100 text-red-700"
                    )}
                  >
                    {data.recommendedCourse.riskLevel}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-gray-500">
                  {data.recommendedCourse.description}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  {t("modules", { count: data.recommendedCourse.moduleCount })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" aria-hidden="true" />
            </div>
          </Link>
        </section>
      )}

      {/* Offline Sync Status */}
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
    </div>
  );
}
