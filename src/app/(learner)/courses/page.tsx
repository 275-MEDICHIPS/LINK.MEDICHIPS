"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
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

type FilterStatus = "ALL" | "IN_PROGRESS" | "COMPLETED" | "AVAILABLE";

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

// ─── Filter Chips ─────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Available", value: "AVAILABLE" },
];

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

function CourseCard({ course }: { course: CourseItem }) {
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
              Completed
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
            Start course
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterStatus }) {
  const messages: Record<FilterStatus, { title: string; desc: string }> = {
    ALL: {
      title: "No courses available",
      desc: "New courses will appear here when they are published by your organization.",
    },
    IN_PROGRESS: {
      title: "No courses in progress",
      desc: "Start a course from the available courses to see your progress here.",
    },
    COMPLETED: {
      title: "No completed courses yet",
      desc: "Complete your enrolled courses to see them here.",
    },
    AVAILABLE: {
      title: "No new courses available",
      desc: "You are enrolled in all available courses. Check back later for new content.",
    },
  };

  const msg = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <BookOpen className="h-6 w-6 text-gray-300" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">{msg.title}</p>
        <p className="mt-1 text-xs text-gray-500">{msg.desc}</p>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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

  // Client-side filtering by enrollment status
  const filteredCourses = useMemo(() => {
    switch (activeFilter) {
      case "IN_PROGRESS":
        return courses.filter(
          (c) => c.isEnrolled && (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100
        );
      case "COMPLETED":
        return courses.filter(
          (c) => c.isEnrolled && (c.progressPct ?? 0) >= 100
        );
      case "AVAILABLE":
        return courses.filter((c) => !c.isEnrolled);
      default:
        return courses;
    }
  }, [courses, activeFilter]);

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
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
          aria-label="Search courses"
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
            Try again
          </Button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
