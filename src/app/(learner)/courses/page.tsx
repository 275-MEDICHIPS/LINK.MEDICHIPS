"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, BookOpen, Video, X, ChevronRight, Play } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
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

function formatDuration(min: number): string {
  if (min <= 0) return "";
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${min}분`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-5" role="status">
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Filter Pill ──────────────────────────────────────────────────────────────

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

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;
  const duration = formatDuration(course.totalDurationMin);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
    >
      {/* Thumbnail */}
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

        {/* Hover play icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md backdrop-blur-sm transition-all group-hover:opacity-100 group-hover:scale-100 scale-90">
            <Play className="ml-0.5 h-3.5 w-3.5 text-gray-800" />
          </div>
        </div>

        {/* Video count */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}

        {/* Progress bar on thumbnail */}
        {course.isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
            <div
              className={cn("h-full transition-all", isCompleted ? "bg-accent-400" : "bg-brand-400")}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
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

// ─── Empty ────────────────────────────────────────────────────────────────────

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="py-24 text-center">
      <BookOpen className="mx-auto h-8 w-8 text-gray-200" />
      <p className="mt-3 text-[14px] font-medium text-gray-400">{title}</p>
      <p className="mt-1 text-[12px] text-gray-300">{desc}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterKey = "all" | "inProgress" | "completed" | string;

export default function CoursesPage() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const urlSearchParams = useSearchParams();
  const initialSearch = urlSearchParams.get("search") || "";
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [userSpecialty, setUserSpecialty] = useState<UserSpecialty | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

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
      const apiUrl = isAuthenticated
        ? `/api/v1/learner/courses?${params.toString()}`
        : `/api/v1/public/courses?${params.toString()}`;
      const res = await fetch(apiUrl);
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
  }, [debouncedSearch, isAuthenticated]);

  useEffect(() => {
    fetchCourses(userSpecialty?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Build subcategory + status data
  const { subCategories, filteredCourses } = useMemo(() => {
    // Subcategory grouping
    const catCounts: Record<string, number> = {};
    for (const course of courses) {
      const cat = categorize(course.slug);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }

    const cats: Array<{ key: string; label: string; count: number }> = [];
    for (const [key, meta] of Object.entries(SUB_CATEGORIES)) {
      if (catCounts[key]) {
        cats.push({ key, label: meta.label, count: catCounts[key] });
      }
    }
    if (catCounts["other"]) {
      cats.push({ key: "other", label: "기타", count: catCounts["other"] });
    }

    // Filter
    let filtered = courses;
    if (activeFilter === "inProgress") {
      filtered = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100);
    } else if (activeFilter === "completed") {
      filtered = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) >= 100);
    } else if (activeFilter !== "all") {
      // subcategory filter
      filtered = courses.filter((c) => categorize(c.slug) === activeFilter);
    }

    return { subCategories: cats, filteredCourses: filtered };
  }, [courses, activeFilter]);

  const inProgressCount = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100).length;
  const completedCount = courses.filter((c) => c.isEnrolled && (c.progressPct ?? 0) >= 100).length;

  return (
    <div className="pb-8">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <input
          type="search"
          placeholder={t("searchCourses")}
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

      {/* Content */}
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-[13px] text-gray-400">{error}</p>
          <button
            onClick={() => fetchCourses(userSpecialty?.id)}
            className="mt-3 text-[13px] font-medium text-brand-500 hover:text-brand-600"
          >
            {tc("tryAgain")}
          </button>
        </div>
      ) : isSearching ? (
        /* ─── Search Results ─── */
        <div>
          <p className="mb-4 text-[13px] text-gray-400">
            검색 결과 <span className="font-semibold tabular-nums text-gray-700">{courses.length}</span>개
          </p>
          {courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          ) : (
            <EmptyState title={t("noSearchResults")} desc={t("noSearchResultsDesc")} />
          )}
        </div>
      ) : (
        /* ─── Browse View ─── */
        <div className="space-y-4">
          {/* Specialty header */}
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-bold text-gray-900">
              {userSpecialty ? userSpecialty.name : "코스 탐색"}
            </h1>
            {isAuthenticated && userSpecialty && (
              <Link
                href="/onboarding/specialty"
                className="flex items-center gap-0.5 text-[12px] font-medium text-gray-400 hover:text-brand-500 transition-colors"
              >
                분야 변경
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Filter pills — horizontal scroll */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
            <FilterPill
              label="전체"
              count={courses.length}
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            />
            {isAuthenticated && inProgressCount > 0 && (
              <FilterPill
                label="수강 중"
                count={inProgressCount}
                active={activeFilter === "inProgress"}
                onClick={() => setActiveFilter("inProgress")}
              />
            )}
            {isAuthenticated && completedCount > 0 && (
              <FilterPill
                label="완료"
                count={completedCount}
                active={activeFilter === "completed"}
                onClick={() => setActiveFilter("completed")}
              />
            )}
            {subCategories.map((cat) => (
              <FilterPill
                key={cat.key}
                label={cat.label}
                count={cat.count}
                active={activeFilter === cat.key}
                onClick={() => setActiveFilter(cat.key)}
              />
            ))}
          </div>

          {/* Course grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredCourses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          ) : (
            <EmptyState
              title={activeFilter === "inProgress" ? "수강 중인 코스가 없습니다" : activeFilter === "completed" ? "완료한 코스가 없습니다" : "해당 카테고리에 코스가 없습니다"}
              desc="다른 카테고리를 선택해보세요"
            />
          )}
        </div>
      )}
    </div>
  );
}
