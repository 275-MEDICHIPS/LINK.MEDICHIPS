"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, BookOpen, Video, X, Play } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
  creatorTitle: string | null;
  creatorField: string | null;
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
  creator: CreatorInfo | null;
  progressPct: number | null;
  isEnrolled: boolean;
}

interface UserSpecialty {
  id: string;
  name: string;
}

// ─── Subcategory ──────────────────────────────────────────────────────────────

const SUB_CATEGORIES: Record<string, { label: string; keywords: string[] }> = {
  endoscopy:  { label: "내시경",   keywords: ["endoscopy", "colonoscopy", "gastroscopy"] },
  ultrasound: { label: "초음파",   keywords: ["ultrasound"] },
  procedure:  { label: "시술",     keywords: ["nerve-block", "joint-injection", "biopsy", "procedure"] },
  basic:      { label: "기초의학", keywords: ["basic", "fundamentals", "introduction", "intro"] },
  diagnosis:  { label: "진단",     keywords: ["diagnosis", "diagnostic"] },
  emergency:  { label: "응급",     keywords: ["emergency", "acute", "critical"] },
};

function categorize(slug: string): string {
  for (const [key, { keywords }] of Object.entries(SUB_CATEGORIES)) {
    if (keywords.some((kw) => slug.includes(kw))) return key;
  }
  return "other";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-100", className)} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-8" role="status">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-6 border-b border-gray-100 pb-px">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-14 rounded" />)}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="mt-3 h-4 w-4/5 rounded" />
            <Skeleton className="mt-2 h-3 w-3/5 rounded" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;
  const duration = course.totalDurationMin > 0
    ? course.totalDurationMin >= 60
      ? `${Math.floor(course.totalDurationMin / 60)}시간 ${course.totalDurationMin % 60 > 0 ? `${course.totalDurationMin % 60}분` : ""}`
      : `${course.totalDurationMin}분`
    : null;

  return (
    <Link href={`/courses/${course.id}`} className="group block">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-50">
            <BookOpen className="h-6 w-6 text-gray-200" />
          </div>
        )}

        {/* Hover play */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
            <Play className="h-4 w-4 text-gray-900 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Video count */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}

        {/* Progress bar at bottom edge */}
        {course.isEnrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
            <div
              className={cn(
                "h-full transition-all",
                isCompleted ? "bg-brand-500" : "bg-brand-400"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.4] text-gray-900">
          {course.title}
        </h3>
        <p className="text-[11px] text-gray-400">
          {[
            course.creator?.name,
            duration,
            course.videoCount > 0 ? `영상 ${course.videoCount}개` : null,
          ].filter(Boolean).join(" · ")}
        </p>
        {course.isEnrolled && (
          <p className={cn(
            "text-[11px] font-medium",
            isCompleted ? "text-brand-500" : "text-gray-400"
          )}>
            {isCompleted ? "수강 완료" : `${Math.round(progress)}% 진행 중`}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="py-20 text-center">
      <p className="text-[14px] font-medium text-gray-400">{title}</p>
      <p className="mt-1 text-[13px] text-gray-300">{desc}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userSpecialty, setUserSpecialty] = useState<UserSpecialty | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  const isSearching = debouncedSearch.length > 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCourses = useCallback(async (specId?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else if (specId) {
        params.set("specialtyId", specId);
      }
      const res = await fetch(`/api/v1/learner/courses?${params.toString()}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load courses (${res.status})`);
      const json = await res.json();
      setCourses(json.data.courses);
      if (json.data.userSpecialty) {
        setUserSpecialty(json.data.userSpecialty);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCourses(userSpecialty?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Build tabs from course data
  const tabs = useMemo(() => {
    const enrolled = courses.filter((c) => c.isEnrolled);
    const groups: Record<string, CourseItem[]> = {};

    for (const course of courses) {
      const cat = categorize(course.slug);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    }

    const result: Array<{ key: string; label: string; courses: CourseItem[] }> = [];
    result.push({ key: "all", label: "전체", courses });

    if (enrolled.length > 0) {
      result.push({ key: "enrolled", label: "수강 중", courses: enrolled });
    }

    for (const [key, meta] of Object.entries(SUB_CATEGORIES)) {
      if (groups[key]?.length) {
        result.push({ key, label: meta.label, courses: groups[key] });
      }
    }
    if (groups["other"]?.length) {
      result.push({ key: "other", label: t("other"), courses: groups["other"] });
    }

    return result;
  }, [courses, t]);

  // Active tab courses
  const activeCourses = useMemo(() => {
    const tab = tabs.find((t) => t.key === activeTab);
    return tab?.courses ?? courses;
  }, [tabs, activeTab, courses]);

  // Reset tab when tabs change
  useEffect(() => {
    if (!tabs.find((t) => t.key === activeTab)) {
      setActiveTab("all");
    }
  }, [tabs, activeTab]);

  return (
    <div>
      {/* Header section */}
      <div className="mb-8">
        {userSpecialty && !isSearching ? (
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-gray-300">
                관심 분야
              </p>
              <h1 className="mt-1 text-[24px] font-bold tracking-tight text-gray-900">
                {userSpecialty.name}
              </h1>
            </div>
            <Link
              href="/onboarding/specialty"
              className="text-[12px] text-gray-300 transition-colors hover:text-gray-500"
            >
              변경
            </Link>
          </div>
        ) : !isSearching ? (
          <h1 className="text-[24px] font-bold tracking-tight text-gray-900">
            코스
          </h1>
        ) : null}
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <input
          type="search"
          placeholder={t("searchCourses")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-[14px] text-gray-900 ring-1 ring-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
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

      {/* Content */}
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-[13px] text-gray-400">{error}</p>
          <button
            onClick={() => fetchCourses(userSpecialty?.id)}
            className="mt-3 text-[13px] font-medium text-gray-900 hover:text-gray-600"
          >
            {tc("tryAgain")}
          </button>
        </div>
      ) : isSearching ? (
        /* Search results */
        <div>
          <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.1em] text-gray-300">
            검색 결과 — {courses.length}개
          </p>
          {courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          ) : (
            <EmptyState title={t("noSearchResults")} desc={t("noSearchResultsDesc")} />
          )}
        </div>
      ) : (
        /* Tab-based view */
        <div>
          {/* Tab bar */}
          {tabs.length > 1 && (
            <div className="mb-8 flex gap-6 border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative pb-3 text-[13px] font-medium transition-colors",
                    activeTab === tab.key
                      ? "text-gray-900"
                      : "text-gray-300 hover:text-gray-500"
                  )}
                >
                  {tab.label}
                  {/* Active underline */}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Course grid */}
          {activeCourses.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              {activeCourses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          ) : (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          )}
        </div>
      )}
    </div>
  );
}
