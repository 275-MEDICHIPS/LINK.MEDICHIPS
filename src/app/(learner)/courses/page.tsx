"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus = "ALL" | "ENROLLED" | "RECOMMENDED";

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
  specialties: Array<{ id: string; name: string }>;
  progressPct: number | null;
  isEnrolled: boolean;
}

interface CoursesResponse {
  courses: CourseItem[];
  total: number;
  page: number;
  pageSize: number;
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

function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <SkeletonBlock className="h-28 w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

function CoursesGridSkeleton() {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      role="status"
      aria-label="Loading courses"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Risk Level Badge ─────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold",
        level === "L1" && "bg-green-100 text-green-700",
        level === "L2" && "bg-amber-100 text-amber-700",
        level === "L3" && "bg-red-100 text-red-700"
      )}
      aria-label={`Risk level ${level}`}
    >
      {level}
    </span>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course, t }: { course: CourseItem; t: ReturnType<typeof useTranslations> }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      aria-label={`${course.title}. ${course.moduleCount} modules. ${Math.round(progress)}% complete. Risk level ${course.riskLevel}`}
    >
      {/* Thumbnail */}
      <div className="relative h-28 w-full bg-gray-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <BookOpen
              className="h-8 w-8 text-brand-300"
              aria-hidden="true"
            />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <RiskBadge level={course.riskLevel} />
        </div>
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold text-white">
              {t("completed")}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-brand-600">
          {course.title}
        </h3>
        <p className="mb-2 text-[10px] text-gray-400">
          {course.moduleCount} module{course.moduleCount !== 1 ? "s" : ""}
          {course.estimatedHours
            ? ` / ${course.estimatedHours}h`
            : ""}
        </p>

        {/* Progress Bar */}
        {course.isEnrolled && (
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Course progress: ${Math.round(progress)}%`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  isCompleted ? "bg-accent-500" : "bg-brand-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-400">
              {Math.round(progress)}%
            </span>
          </div>
        )}
        {!course.isEnrolled && (
          <p className="text-[10px] font-medium text-brand-500">
            {t("startCourse")}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <BookOpen className="h-6 w-6 text-gray-300" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-1 text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function CoursesPage() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const FILTERS: { label: string; value: FilterStatus }[] = [
    { label: t("all"), value: "ALL" },
    { label: t("myCourses"), value: "ENROLLED" },
    { label: t("recommendedCourses"), value: "RECOMMENDED" },
  ];

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/v1/learner/courses?${params.toString()}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load courses (${res.status})`);
      const json: { data: CoursesResponse } = await res.json();
      setCourses(json.data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Split courses by enrollment status
  const enrolledCourses = useMemo(
    () => courses.filter((c) => c.isEnrolled),
    [courses]
  );
  const recommendedCourses = useMemo(
    () => courses.filter((c) => !c.isEnrolled),
    [courses]
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={t("searchCourses")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
          aria-label={t("searchCourses")}
        />
      </div>

      {/* Filter Chips */}
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="tablist"
        aria-label="Course filter"
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            role="tab"
            aria-selected={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              activeFilter === filter.value
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <CoursesGridSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchCourses}>
            {tc("tryAgain")}
          </Button>
        </div>
      ) : activeFilter === "ALL" ? (
        <div className="space-y-6">
          {/* My Courses Section */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              {t("myCourses")}
            </h2>
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <CourseCard key={course.id} course={course} t={t} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t("noEnrolledCourses")}
                desc={t("noEnrolledCoursesDesc")}
              />
            )}
          </section>

          {/* Recommended Courses Section */}
          {recommendedCourses.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {t("recommendedCourses")}
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {recommendedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} t={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : activeFilter === "ENROLLED" ? (
        enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <CourseCard key={course.id} course={course} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("noEnrolledCourses")}
            desc={t("noEnrolledCoursesDesc")}
          />
        )
      ) : recommendedCourses.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {recommendedCourses.map((course) => (
            <CourseCard key={course.id} course={course} t={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("noNewCourses")}
          desc={t("noNewCoursesDesc")}
        />
      )}
    </div>
  );
}
