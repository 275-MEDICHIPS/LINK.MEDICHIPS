"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  BookOpen,
  Video,
  X,
  Play,
  ChevronRight,
  Clock,
  ArrowRight,
} from "lucide-react";
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
  return <div className={cn("animate-pulse rounded-lg bg-gray-100", className)} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-[140px] w-full rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white p-3 shadow-sm">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-3/5" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Continue Learning Card ───────────────────────────────────────────────────

function ContinueLearningCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen className="h-5 w-5 text-gray-200" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
              <Play className="ml-0.5 h-3 w-3 text-gray-900" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-gray-900">
              {course.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-gray-400">
              {course.creator?.name}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="flex-shrink-0 text-[11px] font-medium tabular-nums text-emerald-600">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-shrink-0 items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 transition-colors group-hover:bg-gray-800">
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>
    </Link>
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
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md hover:ring-gray-200"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-gray-200" />
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-md transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-90">
            <Play className="ml-0.5 h-4 w-4 text-gray-900" fill="currentColor" />
          </div>
        </div>

        {/* Video count badge */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}

        {/* Progress bar at bottom */}
        {course.isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
            <div
              className={cn(
                "h-full transition-all",
                isCompleted ? "bg-emerald-500" : "bg-emerald-400"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900">
          {course.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
          {course.creator?.name}
          {duration && (
            <>
              <span className="text-gray-200">·</span>
              <Clock className="h-2.5 w-2.5" />
              {duration}
            </>
          )}
        </p>

        {/* Enrollment status */}
        {course.isEnrolled && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isCompleted ? "bg-emerald-500" : "bg-emerald-400"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={cn(
              "text-[10px] font-medium tabular-nums",
              isCompleted ? "text-emerald-600" : "text-gray-400"
            )}>
              {isCompleted ? "완료" : `${Math.round(progress)}%`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  onViewAll,
}: {
  title: string;
  count: number;
  onViewAll?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[16px] font-bold text-gray-900">{title}</h2>
        <span className="text-[12px] font-medium tabular-nums text-gray-300">
          {count}
        </span>
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-[12px] font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          전체보기
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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

  // Build section data
  const { enrolledCourses, continueCourse, sections } = useMemo(() => {
    const enrolled = courses.filter((c) => c.isEnrolled);
    const inProgress = enrolled
      .filter((c) => (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100)
      .sort((a, b) => (b.progressPct ?? 0) - (a.progressPct ?? 0));

    // Group by subcategory
    const groups: Record<string, CourseItem[]> = {};
    for (const course of courses) {
      const cat = categorize(course.slug);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    }

    const secs: Array<{ key: string; label: string; courses: CourseItem[] }> = [];
    for (const [key, meta] of Object.entries(SUB_CATEGORIES)) {
      if (groups[key]?.length) {
        secs.push({ key, label: meta.label, courses: groups[key] });
      }
    }
    if (groups["other"]?.length) {
      secs.push({ key: "other", label: t("other"), courses: groups["other"] });
    }

    // If no subcategory sections, show all as one section
    if (secs.length === 0 && courses.length > 0) {
      secs.push({ key: "all", label: "전체 코스", courses });
    }

    return {
      enrolledCourses: enrolled,
      continueCourse: inProgress[0] ?? null,
      sections: secs,
    };
  }, [courses, t]);

  return (
    <div className="pb-8">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <input
          type="search"
          placeholder={t("searchCourses")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-[14px] text-gray-900 shadow-sm ring-1 ring-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
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
        /* ─── Search Results ─── */
        <div>
          <p className="mb-4 text-[12px] font-medium text-gray-400">
            검색 결과 <span className="tabular-nums text-gray-900">{courses.length}</span>개
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
        /* ─── Main View ─── */
        <div className="space-y-8">
          {/* Specialty header */}
          {userSpecialty && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-gray-300">
                  관심 분야
                </p>
                <h1 className="mt-0.5 text-[22px] font-bold tracking-tight text-gray-900">
                  {userSpecialty.name}
                </h1>
              </div>
              <Link
                href="/onboarding/specialty"
                className="rounded-full bg-gray-50 px-3 py-1.5 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-100"
              >
                변경
              </Link>
            </div>
          )}

          {!userSpecialty && (
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">
              코스
            </h1>
          )}

          {/* Continue Learning */}
          {continueCourse && (
            <div>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[16px] font-bold text-gray-900">이어서 학습</h2>
              </div>
              <ContinueLearningCard course={continueCourse} />
            </div>
          )}

          {/* Enrolled courses (completed or newly enrolled) */}
          {enrolledCourses.length > 1 && (
            <div>
              <SectionHeader
                title="수강 중"
                count={enrolledCourses.length}
                onViewAll={
                  enrolledCourses.length > 4
                    ? () => setExpandedSection(expandedSection === "enrolled" ? null : "enrolled")
                    : undefined
                }
              />
              <div className="grid grid-cols-2 gap-3">
                {(expandedSection === "enrolled"
                  ? enrolledCourses
                  : enrolledCourses.slice(0, 4)
                ).map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          )}

          {/* Subcategory Sections */}
          {sections.map((section) => (
            <div key={section.key}>
              <SectionHeader
                title={section.label}
                count={section.courses.length}
                onViewAll={
                  section.courses.length > 4
                    ? () => setExpandedSection(
                        expandedSection === section.key ? null : section.key
                      )
                    : undefined
                }
              />
              <div className="grid grid-cols-2 gap-3">
                {(expandedSection === section.key
                  ? section.courses
                  : section.courses.slice(0, 4)
                ).map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          ))}

          {/* No courses at all */}
          {courses.length === 0 && (
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
