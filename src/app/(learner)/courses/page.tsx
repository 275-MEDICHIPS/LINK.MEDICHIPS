"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  BookOpen,
  Loader2,
  Video,
  X,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

// ─── Subcategory grouping ────────────────────────────────────────────────────

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
    <div className="w-[160px] flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <SkeletonBlock className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function HorizontalSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" role="status" aria-label="Loading courses">
      {Array.from({ length: 3 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" role="status" aria-label="Loading courses">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <SkeletonBlock className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-3">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
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

// ─── Video Course Card ───────────────────────────────────────────────────────

function VideoCourseCard({ course, className }: { course: CourseItem; className?: string }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative aspect-video w-full bg-gray-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
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

        {/* Creator overlay (bottom-left) */}
        {course.creator && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
            {course.creator.avatarUrl ? (
              <img
                src={course.creator.avatarUrl}
                alt=""
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[8px] font-bold text-white">
                {course.creator.name.charAt(0)}
              </div>
            )}
            <span className="text-[10px] font-medium text-white">
              {course.creator.name}
            </span>
          </div>
        )}

        {/* Video count badge (bottom-right) */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Video className="h-3 w-3" aria-hidden="true" />
            {course.videoCount}
          </div>
        )}

        {/* Risk level (top-right) */}
        <div className="absolute right-1.5 top-1.5">
          <RiskBadge level={course.riskLevel} />
        </div>

        {/* Completed overlay */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold text-white">
              완료
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h3 className="line-clamp-1 text-xs font-semibold text-gray-900 group-hover:text-brand-600">
          {course.title}
        </h3>

        {/* Progress Bar */}
        {course.isEnrolled && (
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
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
      </div>
    </Link>
  );
}

// ─── Horizontal Scroll Section ────────────────────────────────────────────────

function HorizontalCourseSection({
  title,
  courses,
}: {
  title: string;
  courses: CourseItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (courses.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="text-[10px] text-gray-400">
          {courses.length}개
        </span>
      </div>
      <div
        ref={scrollRef}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x scrollbar-hide"
      >
        {courses.map((course) => (
          <VideoCourseCard
            key={course.id}
            course={course}
            className="w-[160px] flex-shrink-0 snap-start"
          />
        ))}
      </div>
    </section>
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userSpecialty, setUserSpecialty] = useState<UserSpecialty | null>(null);

  const isSearching = debouncedSearch.length > 0;

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timeout);
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

  // Fetch on mount and when search/specialty changes
  useEffect(() => {
    fetchCourses(userSpecialty?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Group courses for the default (non-search) view
  const enrolledCourses = useMemo(
    () => courses.filter((c) => c.isEnrolled),
    [courses]
  );

  const subcategoryGroups = useMemo(() => {
    const nonEnrolled = courses.filter((c) => !c.isEnrolled);
    const groups: Record<string, CourseItem[]> = {};

    for (const course of nonEnrolled) {
      const cat = categorize(course.slug);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    }

    // Sort: known categories first, then "other"
    const ordered: Array<{ key: string; label: string; courses: CourseItem[] }> = [];
    for (const [key, meta] of Object.entries(SUB_CATEGORIES)) {
      if (groups[key]?.length) {
        ordered.push({ key, label: meta.label, courses: groups[key] });
      }
    }
    if (groups["other"]?.length) {
      ordered.push({ key: "other", label: t("other"), courses: groups["other"] });
    }
    return ordered;
  }, [courses, t]);

  // If no groups and all enrolled
  const allCoursesGrouped = useMemo(() => {
    if (!isSearching) return null;
    // In search mode, just return all courses
    return courses;
  }, [courses, isSearching]);

  function clearSearch() {
    setSearchQuery("");
    setDebouncedSearch("");
  }

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
          className="pl-9 pr-9 text-sm"
          aria-label={t("searchCourses")}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        isSearching ? <GridSkeleton /> : <HorizontalSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchCourses(userSpecialty?.id)}>
            {tc("tryAgain")}
          </Button>
        </div>
      ) : isSearching ? (
        /* ── Search View ── */
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-600">
            {t("searchResults", { count: courses.length })}
          </p>
          {courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {courses.map((course) => (
                <VideoCourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("noSearchResults")}
              desc={t("noSearchResultsDesc")}
            />
          )}
        </div>
      ) : (
        /* ── Default View: Specialty-based ── */
        <div className="space-y-6">
          {/* Specialty header */}
          {userSpecialty && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {userSpecialty.name}
              </h2>
              <Link
                href="/onboarding/specialty"
                className="text-xs font-medium text-brand-500 hover:text-brand-600"
              >
                {t("changeSpecialty")}
              </Link>
            </div>
          )}

          {/* My Courses (enrolled) — horizontal scroll */}
          {enrolledCourses.length > 0 && (
            <HorizontalCourseSection
              title={t("myCourses")}
              courses={enrolledCourses}
            />
          )}

          {/* Subcategory sections — horizontal scroll each */}
          {subcategoryGroups.map((group) => (
            <HorizontalCourseSection
              key={group.key}
              title={group.label}
              courses={group.courses}
            />
          ))}

          {/* Empty state */}
          {enrolledCourses.length === 0 && subcategoryGroups.length === 0 && courses.length === 0 && (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          )}

          {/* If there are courses but no subcategory groups and no enrolled (all in "other") */}
          {enrolledCourses.length === 0 && subcategoryGroups.length === 0 && courses.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {courses.map((course) => (
                <VideoCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
