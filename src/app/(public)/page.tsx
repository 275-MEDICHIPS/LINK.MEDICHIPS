"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  BookOpen,
  Video,
  X,
  ChevronRight,
  Play,
  Flame,
  Zap,
  Clock,
  CheckCircle2,
  Loader2,
  Wifi,
  WifiOff,
  Stethoscope,
  Scan,
  Syringe,
  Heart,
  Activity,
  Microscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CelebrationModal } from "@/components/gamification/celebration-modal";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { cn } from "@/lib/utils";

import { LogoCarousel } from "./components/logo-carousel";
import { HowItWorks } from "./components/how-it-works";
import { ResultsGrid } from "./components/results-grid";
import { FaqAccordion } from "./components/faq-accordion";
import { CtaSection } from "./components/cta-section";

// ─── Unified Home ────────────────────────────────────────────────────────────

export default function UnifiedHomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <AuthenticatedHome /> : <PublicHome />;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC HOME (비로그인 - Zocdoc style)
// ═══════════════════════════════════════════════════════════════════════════════

interface PublicCourse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  riskLevel: string;
  estimatedHours: number | null;
  moduleCount: number;
  videoCount: number;
  creator: { name: string; creatorTitle: string | null } | null;
}

const SPECIALTIES = [
  { icon: Scan, label: "내시경", desc: "Endoscopy" },
  { icon: Heart, label: "심초음파", desc: "Echo" },
  { icon: Activity, label: "초음파", desc: "Ultrasound" },
  { icon: Syringe, label: "시술", desc: "Procedure" },
  { icon: Stethoscope, label: "갑상선", desc: "Thyroid" },
  { icon: Microscope, label: "관절", desc: "Joint" },
];

const POPULAR_TAGS = ["대장내시경", "위내시경", "복부초음파", "갑상선초음파"];

function PublicHome() {
  const t = useTranslations("landing");
  const [courses, setCourses] = useState<PublicCourse[]>([]);

  useEffect(() => {
    fetch("/api/v1/public/courses")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.courses) setCourses(json.data.courses);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* ─── Hero ─── */}
      <section className="bg-white pb-16 pt-28 sm:pt-32 sm:pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              {t("heroSubtitle")}
            </p>

            {/* Search bar */}
            <Link
              href="/login"
              className="group mx-auto mt-8 flex max-w-lg items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-3.5 shadow-lg shadow-gray-200/50 transition-all hover:shadow-xl hover:border-brand-200"
            >
              <Search className="h-5 w-5 text-gray-300" />
              <span className="flex-1 text-left text-[15px] text-gray-400">
                전문분야 또는 강좌명 검색...
              </span>
              <span className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors group-hover:bg-brand-600">
                검색
              </span>
            </Link>

            {/* Popular tags */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-gray-400">인기:</span>
              {POPULAR_TAGS.map((tag) => (
                <Link
                  key={tag}
                  href="/login"
                  className="text-xs font-medium text-brand-500 hover:text-brand-600 hover:underline"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Specialty Grid ─── */}
      <section className="bg-gray-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            전문분야별 교육
          </h2>
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 sm:grid-cols-6">
            {SPECIALTIES.map((spec) => (
              <Link
                key={spec.label}
                href="/login"
                className="group flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-100">
                  <spec.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-gray-900">{spec.label}</span>
                <span className="text-[10px] text-gray-400">{spec.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Popular Courses ─── */}
      {courses.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                인기 강좌
              </h2>
              <p className="mt-2 text-gray-500">
                실전 의료 영상으로 배우는 전문 교육과정
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
              {courses.slice(0, 4).map((course) => (
                <Link
                  key={course.id}
                  href="/login"
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-lg hover:ring-brand-200"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <BookOpen className="h-8 w-8 text-gray-200" />
                      </div>
                    )}
                    {/* Hover play */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 group-hover:scale-100 scale-90">
                        <Play className="ml-0.5 h-5 w-5 text-gray-800" />
                      </div>
                    </div>
                    {course.videoCount > 0 && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                        <Video className="h-3 w-3" />
                        {course.videoCount}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 text-base font-bold text-gray-900">
                      {course.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {[course.creator?.name, `${course.moduleCount}개 모듈`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Reused sections ─── */}
      <HowItWorks />
      <ResultsGrid />
      <LogoCarousel />
      <FaqAccordion />
      <CtaSection />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTHENTICATED HOME (로그인 - Dashboard + Course Catalog)
// ═══════════════════════════════════════════════════════════════════════════════

interface CreatorInfo {
  name: string;
  avatarUrl: string | null;
  creatorTitle: string | null;
}

interface DashboardData {
  user: { name: string; avatarUrl: string | null };
  totalXp: number;
  level: number;
  streak: { currentStreak: number };
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
  dailyGoal: { targetMin: number; completedMin: number; lessonsToday: number };
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    checklistTotal: number;
    checklistDone: number;
  }>;
}

interface CourseItem {
  id: string;
  slug: string;
  riskLevel: "L1" | "L2" | "L3";
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  title: string;
  description: string | null;
  moduleCount: number;
  enrollmentCount: number;
  videoCount: number;
  totalDurationMin: number;
  specialties: Array<{ id: string; name: string }>;
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
    creatorTitle: string | null;
    creatorField: string | null;
  } | null;
  progressPct: number | null;
  isEnrolled: boolean;
}

interface LessonCompletedData {
  lessonTitle: string;
  xpEarned: number;
  nextLessonId: string | null;
  nextModuleId: string | null;
  courseId: string;
}

// ─── Subcategory helpers (from courses page) ─────────────────────────────────

const SUB_CATEGORIES: Record<string, { label: string; keywords: string[] }> = {
  endoscopy: { label: "내시경", keywords: ["endoscopy", "colonoscopy", "gastroscopy"] },
  ultrasound: { label: "초음파", keywords: ["ultrasound"] },
  procedure: { label: "시술", keywords: ["nerve-block", "joint-injection", "biopsy", "procedure"] },
  basic: { label: "기초의학", keywords: ["basic", "fundamentals", "introduction", "intro"] },
  diagnosis: { label: "진단", keywords: ["diagnosis", "diagnostic"] },
  emergency: { label: "응급", keywords: ["emergency", "acute", "critical"] },
};

function categorize(slug: string): string {
  for (const [key, { keywords }] of Object.entries(SUB_CATEGORIES)) {
    if (keywords.some((kw) => slug.includes(kw))) return key;
  }
  return "other";
}

function formatDuration(min: number): string {
  if (min <= 0) return "";
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${min}분`;
}

type FilterKey = "all" | "inProgress" | "completed" | string;

// ─── Skeletons ───────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-gray-200", className)} aria-hidden="true" />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <SkeletonBlock className="aspect-video w-full rounded-2xl" />
      <SkeletonBlock className="h-8 w-full rounded-xl" />
      <SkeletonBlock className="h-6 w-3/4 rounded-lg" />
      <SkeletonBlock className="h-11 w-full rounded-xl" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-48 rounded-xl" />)}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Course Card (reused from courses page) ──────────────────────────────────

function CourseCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;
  const duration = formatDuration(course.totalDurationMin);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <BookOpen className="h-6 w-6 text-gray-200" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md backdrop-blur-sm transition-all group-hover:opacity-100 group-hover:scale-100 scale-90">
            <Play className="ml-0.5 h-3.5 w-3.5 text-gray-800" />
          </div>
        </div>
        {course.videoCount > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}
        {course.isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
            <div
              className={cn("h-full transition-all", isCompleted ? "bg-accent-400" : "bg-brand-400")}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="px-2.5 py-2.5">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-[1.35] text-gray-900">
          {course.title}
        </h3>
        <p className="mt-1 text-[11px] text-gray-400">
          {[course.creator?.name, duration].filter(Boolean).join(" · ")}
        </p>
        {course.isEnrolled && (
          <p className={cn(
            "mt-1.5 text-[11px] font-semibold",
            isCompleted ? "text-accent-500" : "text-brand-500"
          )}>
            {isCompleted ? "완료 ✓" : `${Math.round(progress)}% 진행 중`}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all",
        active
          ? "bg-brand-500 text-white shadow-sm"
          : "bg-white text-gray-500 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-gray-700"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn("ml-1 tabular-nums", active ? "text-white/70" : "text-gray-300")}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── AuthenticatedHome ───────────────────────────────────────────────────────

function AuthenticatedHome() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tCourse = useTranslations("course");
  const router = useRouter();

  // Dashboard data
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Course catalog data
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  // Celebration
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<LessonCompletedData | null>(null);

  const isSearching = debouncedSearch.length > 0;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      setDashLoading(true);
      setDashError(null);
      const res = await fetch("/api/v1/learner/dashboard");
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = await res.json();
      setDashData(json.data);
    } catch (err) {
      setDashError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setDashLoading(false);
    }
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      setCoursesLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/v1/learner/courses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCourses(json.data.courses);
      }
    } catch {
      // silently fail for courses
    } finally {
      setCoursesLoading(false);
    }
  }, [debouncedSearch]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchDashboard(), fetchCourses()]);
  }, [fetchDashboard, fetchCourses]);

  const { isRefreshing, pullDistance, handlers } = usePullToRefresh(refreshAll);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Celebration check
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lessonCompleted");
      if (raw) {
        sessionStorage.removeItem("lessonCompleted");
        const parsed: LessonCompletedData = JSON.parse(raw);
        setCelebrationData(parsed);
        setCelebrationOpen(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Online status
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

  // Course filtering
  const { subCategories, filteredCourses } = useMemo(() => {
    const catCounts: Record<string, number> = {};
    for (const course of courses) {
      const cat = categorize(course.slug);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const cats: Array<{ key: string; label: string; count: number }> = [];
    for (const [key, meta] of Object.entries(SUB_CATEGORIES)) {
      if (catCounts[key]) cats.push({ key, label: meta.label, count: catCounts[key] });
    }
    if (catCounts["other"]) cats.push({ key: "other", label: "기타", count: catCounts["other"] });

    let filtered = courses;
    if (activeFilter === "inProgress") {
      filtered = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100);
    } else if (activeFilter === "completed") {
      filtered = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) >= 100);
    } else if (activeFilter !== "all") {
      filtered = courses.filter((c) => categorize(c.slug) === activeFilter);
    }
    return { subCategories: cats, filteredCourses: filtered };
  }, [courses, activeFilter]);

  const inProgressCount = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100).length;
  const completedCount = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) >= 100).length;

  // Loading state
  if (dashLoading && !dashData) return <DashboardSkeleton />;

  if (dashError && !dashData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-gray-500">{dashError}</p>
        <Button variant="outline" size="sm" onClick={refreshAll}>{tc("tryAgain")}</Button>
      </div>
    );
  }

  if (!dashData) return null;

  const goalPct = Math.min(
    Math.round((dashData.dailyGoal.completedMin / dashData.dailyGoal.targetMin) * 100),
    100
  );
  const goalAchieved = goalPct >= 100;

  return (
    <div className="space-y-4 pb-4" {...handlers}>
      {/* Pull-to-refresh */}
      {(pullDistance > 0 || isRefreshing) && (
        <div className="flex items-center justify-center transition-all duration-200" style={{ height: `${pullDistance}px` }}>
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
          ) : (
            <div
              className="h-5 w-5 rounded-full border-2 border-brand-300 border-t-brand-500 transition-transform"
              style={{ transform: `rotate(${(pullDistance / 50) * 360}deg)` }}
            />
          )}
        </div>
      )}

      {/* ─── Continue Learning Hero ─── */}
      {dashData.continueLearning ? (
        <Link
          href={`/courses/${dashData.continueLearning.courseId}/modules/${dashData.continueLearning.moduleId}/lessons/${dashData.continueLearning.lessonId}`}
          className="group relative block overflow-hidden rounded-2xl bg-gray-900"
        >
          <div className="relative aspect-video w-full">
            {dashData.continueLearning.thumbnailUrl ? (
              <img
                src={dashData.continueLearning.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <Video className="h-12 w-12 text-gray-600" aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                <Play className="ml-1 h-6 w-6 text-gray-900" aria-hidden="true" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
              {dashData.continueLearning.creator && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  {dashData.continueLearning.creator.avatarUrl ? (
                    <img src={dashData.continueLearning.creator.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/30" />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold text-white">
                      {dashData.continueLearning.creator.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-[11px] font-medium text-white/80">
                    {dashData.continueLearning.creator.name}
                  </span>
                  {dashData.continueLearning.creator.creatorTitle && (
                    <span className="text-[10px] text-white/50">
                      {dashData.continueLearning.creator.creatorTitle}
                    </span>
                  )}
                </div>
              )}
              <h2 className="text-base font-bold text-white leading-tight">
                {dashData.continueLearning.courseTitle}
              </h2>
              <p className="mt-0.5 text-xs text-white/60">
                {dashData.continueLearning.lessonTitle}
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all duration-500"
                  style={{ width: `${dashData.continueLearning.progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-white/50">
                {Math.round(dashData.continueLearning.progressPct)}% {t("completed")}
              </p>
            </div>
          </div>
        </Link>
      ) : null}

      {/* ─── Quick Stats ─── */}
      <div className="flex items-center justify-around rounded-xl bg-gray-50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
          <span className="text-sm font-bold text-gray-900">{dashData.streak.currentStreak}</span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-brand-500" aria-hidden="true" />
          <span className="text-sm font-bold text-gray-900">{dashData.totalXp.toLocaleString()}</span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <span className="text-sm font-bold text-gray-900">Lv.{dashData.level}</span>
      </div>

      {/* ─── Daily Goal ─── */}
      <div className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2.5",
        goalAchieved ? "bg-accent-50" : "bg-white border border-gray-100"
      )}>
        <div className="relative h-8 w-8 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" className="stroke-gray-100" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
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
              {dashData.dailyGoal.completedMin}/{dashData.dailyGoal.targetMin}{t("min")}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {goalAchieved ? (
              <span className="flex items-center gap-1 text-accent-600">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("goalAchieved")}
              </span>
            ) : (
              t("lessonsToday", { count: dashData.dailyGoal.lessonsToday })
            )}
          </span>
        </div>
      </div>

      {/* ─── Course Catalog ─── */}
      <section className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
          <input
            type="search"
            placeholder={tCourse("searchCourses")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-[14px] text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        {!isSearching && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
            <FilterPill label="전체" count={courses.length} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            {inProgressCount > 0 && (
              <FilterPill label="수강 중" count={inProgressCount} active={activeFilter === "inProgress"} onClick={() => setActiveFilter("inProgress")} />
            )}
            {completedCount > 0 && (
              <FilterPill label="완료" count={completedCount} active={activeFilter === "completed"} onClick={() => setActiveFilter("completed")} />
            )}
            {subCategories.map((cat) => (
              <FilterPill key={cat.key} label={cat.label} count={cat.count} active={activeFilter === cat.key} onClick={() => setActiveFilter(cat.key)} />
            ))}
          </div>
        )}

        {/* Course grid */}
        {coursesLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : isSearching ? (
          <div>
            <p className="mb-4 text-[13px] text-gray-400">
              검색 결과 <span className="font-semibold tabular-nums text-gray-700">{courses.length}</span>개
            </p>
            {courses.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {courses.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>
            ) : (
              <div className="py-16 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-gray-200" />
                <p className="mt-3 text-[14px] font-medium text-gray-400">{tCourse("noSearchResults")}</p>
              </div>
            )}
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredCourses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        ) : (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-gray-200" />
            <p className="mt-3 text-[14px] font-medium text-gray-400">
              {activeFilter === "inProgress" ? "수강 중인 코스가 없습니다" : activeFilter === "completed" ? "완료한 코스가 없습니다" : "해당 카테고리에 코스가 없습니다"}
            </p>
          </div>
        )}
      </section>

      {/* ─── Pending Tasks ─── */}
      {dashData.pendingTasks.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{t("todayTasks")}</h3>
            <Link href="/tasks" className="flex items-center text-xs text-gray-400 hover:text-brand-500">
              {tc("viewAll")}
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {dashData.pendingTasks.map((task) => (
              <Link
                key={task.id}
                href="/tasks"
                className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2 transition-colors hover:bg-gray-50"
              >
                <div className={cn(
                  "h-2 w-2 flex-shrink-0 rounded-full",
                  task.status === "IN_PROGRESS" ? "bg-blue-400" : "bg-gray-300"
                )} />
                <p className="flex-1 truncate text-xs font-medium text-gray-900">{task.title}</p>
                {task.checklistTotal > 0 && (
                  <span className="text-[10px] text-gray-400">{task.checklistDone}/{task.checklistTotal}</span>
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
          isOnline ? "bg-accent-50 text-accent-700" : "bg-amber-50 text-amber-700"
        )}
        role="status"
        aria-live="polite"
      >
        {isOnline ? (
          <><Wifi className="h-3.5 w-3.5" aria-hidden="true" />{tc("allDataSynced")}</>
        ) : (
          <><WifiOff className="h-3.5 w-3.5" aria-hidden="true" />{tc("offlineChangesWillSync")}</>
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
