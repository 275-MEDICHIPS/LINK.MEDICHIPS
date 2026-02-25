"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  BookOpen,
  Loader2,
  Video,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus = "ALL" | "ENROLLED" | "RECOMMENDED";
type RiskFilter = "ALL" | "L1" | "L2" | "L3";
type SortOption = "latest" | "titleAZ" | "titleZA";

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

// ─── Medical categories ───────────────────────────────────────────────────────

const MEDICAL_CATEGORIES = [
  "내과", "외과", "응급의학", "간호", "치위생",
  "물리치료", "임상병리", "방사선", "약학", "한의학",
  "정형외과", "소아과", "산부인과", "피부과", "안과",
  "이비인후과", "마취통증의학",
];

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
      <SkeletonBlock className="aspect-video w-full rounded-none" />
      <div className="space-y-2 p-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
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

// ─── Video Course Card ───────────────────────────────────────────────────────

function VideoCourseCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
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
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/v1/learner/courses?${params.toString()}`);
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load courses (${res.status})`);
      const json = await res.json();
      setCourses(json.data.courses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Apply risk level filter and sort
  const applyFiltersAndSort = useCallback(
    (list: CourseItem[]) => {
      let filtered = list;
      if (riskFilter !== "ALL") {
        filtered = filtered.filter((c) => c.riskLevel === riskFilter);
      }
      const sorted = [...filtered];
      switch (sortOption) {
        case "titleAZ":
          sorted.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case "titleZA":
          sorted.sort((a, b) => b.title.localeCompare(a.title));
          break;
        case "latest":
        default:
          break;
      }
      return sorted;
    },
    [riskFilter, sortOption]
  );

  // Split courses by enrollment status
  const enrolledCourses = useMemo(
    () => applyFiltersAndSort(courses.filter((c) => c.isEnrolled)),
    [courses, applyFiltersAndSort]
  );
  const recommendedCourses = useMemo(
    () => applyFiltersAndSort(courses.filter((c) => !c.isEnrolled)),
    [courses, applyFiltersAndSort]
  );

  // Extract available categories from course data
  const availableCategories = useMemo(() => {
    const fields = new Set<string>();
    for (const c of courses) {
      if (c.creator?.creatorField) fields.add(c.creator.creatorField);
    }
    return MEDICAL_CATEGORIES.filter((cat) => fields.has(cat));
  }, [courses]);

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

      {/* Category Chips (horizontal scroll) */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 snap-x">
        {MEDICAL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              setSelectedCategory(selectedCategory === cat ? null : cat)
            }
            className={cn(
              "flex-shrink-0 snap-start rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selectedCategory === cat
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex gap-2"
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
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === filter.value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex gap-2">
        <Select
          value={riskFilter}
          onValueChange={(v) => setRiskFilter(v as RiskFilter)}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder={t("riskLevel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("allLevels")}</SelectItem>
            <SelectItem value="L1">L1</SelectItem>
            <SelectItem value="L2">L2</SelectItem>
            <SelectItem value="L3">L3</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortOption}
          onValueChange={(v) => setSortOption(v as SortOption)}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder={t("sort")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">{t("latest")}</SelectItem>
            <SelectItem value="titleAZ">{t("titleAZ")}</SelectItem>
            <SelectItem value="titleZA">{t("titleZA")}</SelectItem>
          </SelectContent>
        </Select>
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
          {enrolledCourses.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {t("myCourses")}
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <VideoCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}

          {/* All / Recommended Courses Section */}
          {recommendedCourses.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {t("recommendedCourses")}
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {recommendedCourses.map((course) => (
                  <VideoCourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          )}

          {enrolledCourses.length === 0 && recommendedCourses.length === 0 && (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          )}
        </div>
      ) : activeFilter === "ENROLLED" ? (
        enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <VideoCourseCard key={course.id} course={course} />
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
            <VideoCourseCard key={course.id} course={course} />
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
