"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  BookOpen,
  Video,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  Users,
  Play,
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

const SUB_CATEGORIES: Record<string, { label: string; icon: string; keywords: string[] }> = {
  endoscopy:  { label: "내시경",   icon: "🔍", keywords: ["endoscopy", "colonoscopy", "gastroscopy"] },
  ultrasound: { label: "초음파",   icon: "📡", keywords: ["ultrasound"] },
  procedure:  { label: "시술",     icon: "💉", keywords: ["nerve-block", "joint-injection", "biopsy", "procedure"] },
  basic:      { label: "기초의학", icon: "📚", keywords: ["basic", "fundamentals", "introduction", "intro"] },
  diagnosis:  { label: "진단",     icon: "🩺", keywords: ["diagnosis", "diagnostic"] },
  emergency:  { label: "응급",     icon: "🚑", keywords: ["emergency", "acute", "critical"] },
};

function categorize(slug: string): string {
  for (const [key, { keywords }] of Object.entries(SUB_CATEGORIES)) {
    if (keywords.some((kw) => slug.includes(kw))) return key;
  }
  return "other";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-100", className)} />;
}

function CardSkeleton({ horizontal }: { horizontal?: boolean }) {
  return (
    <div className={cn(
      "overflow-hidden rounded-2xl bg-white shadow-sm",
      horizontal ? "w-[200px] flex-shrink-0" : ""
    )}>
      <SkeletonPulse className="aspect-video w-full rounded-none" />
      <div className="space-y-2.5 p-3.5">
        <SkeletonPulse className="h-4 w-4/5" />
        <SkeletonPulse className="h-3 w-3/5" />
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonPulse className="h-5 w-24" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => <CardSkeleton key={i} horizontal />)}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <SkeletonPulse className="h-11 w-full" />
      <SectionSkeleton />
      <SectionSkeleton />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <SkeletonPulse className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );
}

// ─── Video Course Card ───────────────────────────────────────────────────────

function VideoCourseCard({ course, className }: { course: CourseItem; className?: string }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;
  const durationText = course.totalDurationMin > 0
    ? course.totalDurationMin >= 60
      ? `${Math.floor(course.totalDurationMin / 60)}h ${course.totalDurationMin % 60}m`
      : `${course.totalDurationMin}분`
    : null;

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Thumbnail — 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 via-brand-50 to-accent-50">
            <BookOpen className="h-8 w-8 text-brand-300" aria-hidden="true" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm">
            <Play className="h-4 w-4 text-brand-600 ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Creator pill (bottom-left) */}
        {course.creator && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-md">
            {course.creator.avatarUrl ? (
              <img
                src={course.creator.avatarUrl}
                alt=""
                className="h-4 w-4 rounded-full object-cover ring-1 ring-white/30"
              />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[8px] font-bold text-white">
                {course.creator.name.charAt(0)}
              </div>
            )}
            <span className="text-[10px] font-medium text-white/90">
              {course.creator.name}
            </span>
          </div>
        )}

        {/* Video count (bottom-right) */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md">
            <Video className="h-3 w-3" aria-hidden="true" />
            {course.videoCount}
          </div>
        )}

        {/* Risk level (top-left) */}
        <div className="absolute left-2 top-2">
          <span className={cn(
            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide backdrop-blur-md",
            course.riskLevel === "L1" && "bg-emerald-500/20 text-emerald-100",
            course.riskLevel === "L2" && "bg-amber-500/20 text-amber-100",
            course.riskLevel === "L3" && "bg-red-500/20 text-red-100"
          )}>
            {course.riskLevel}
          </span>
        </div>

        {/* Completed overlay */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1.5 shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-bold text-white">완료</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand-600">
          {course.title}
        </h3>

        {/* Meta row */}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
          {durationText && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {durationText}
            </span>
          )}
          {course.enrollmentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {course.enrollmentCount}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {course.isEnrolled && !isCompleted && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-brand-500">
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
  icon,
  courses,
}: {
  title: string;
  icon?: string;
  courses: CourseItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (courses.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-400">
            {courses.length}
          </span>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 snap-x scrollbar-hide"
      >
        {courses.map((course) => (
          <VideoCourseCard
            key={course.id}
            course={course}
            className="w-[200px] flex-shrink-0 snap-start"
          />
        ))}
      </div>
    </section>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 px-8 py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <BookOpen className="h-6 w-6 text-gray-300" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{desc}</p>
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

  // Debounce search
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

  useEffect(() => {
    fetchCourses(userSpecialty?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Group courses
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
    const ordered: Array<{ key: string; label: string; icon: string; courses: CourseItem[] }> = [];
    for (const [key, meta] of Object.entries(SUB_CATEGORIES)) {
      if (groups[key]?.length) {
        ordered.push({ key, label: meta.label, icon: meta.icon, courses: groups[key] });
      }
    }
    if (groups["other"]?.length) {
      ordered.push({ key: "other", label: t("other"), icon: "📂", courses: groups["other"] });
    }
    return ordered;
  }, [courses, t]);

  function clearSearch() {
    setSearchQuery("");
    setDebouncedSearch("");
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder={t("searchCourses")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 shadow-sm ring-1 ring-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-shadow"
          aria-label={t("searchCourses")}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-gray-100 p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        isSearching ? <GridSkeleton /> : <PageSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-sm text-gray-400">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCourses(userSpecialty?.id)}
            className="rounded-xl"
          >
            {tc("tryAgain")}
          </Button>
        </div>
      ) : isSearching ? (
        /* ── Search View ── */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              검색 결과
            </p>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
              {courses.length}
            </span>
          </div>
          {courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
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
        /* ── Default View ── */
        <div className="space-y-8">
          {/* Specialty header */}
          {userSpecialty && (
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand-500 to-brand-700 px-5 py-4 shadow-lg shadow-brand-500/15">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-brand-200">
                  내 관심 분야
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-white">
                  {userSpecialty.name}
                </h2>
              </div>
              <Link
                href="/onboarding/specialty"
                className="flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                {t("changeSpecialty")}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Enrolled courses */}
          {enrolledCourses.length > 0 && (
            <HorizontalCourseSection
              title={t("myCourses")}
              icon="📖"
              courses={enrolledCourses}
            />
          )}

          {/* Subcategory sections */}
          {subcategoryGroups.map((group) => (
            <HorizontalCourseSection
              key={group.key}
              title={group.label}
              icon={group.icon}
              courses={group.courses}
            />
          ))}

          {/* Empty / fallback */}
          {enrolledCourses.length === 0 && subcategoryGroups.length === 0 && courses.length === 0 && (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          )}

          {enrolledCourses.length === 0 && subcategoryGroups.length === 0 && courses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-base">📂</span>
                <h2 className="text-[15px] font-bold text-gray-900">전체 코스</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-400">
                  {courses.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {courses.map((course) => (
                  <VideoCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
