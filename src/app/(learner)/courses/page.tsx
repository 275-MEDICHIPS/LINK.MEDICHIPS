"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Search, BookOpen, Video, X } from "lucide-react";
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
  return <div className={cn("animate-pulse rounded-lg bg-gray-100", className)} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-10" role="status">
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-16" />
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-[200px] flex-shrink-0">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course, className }: { course: CourseItem; className?: string }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn("group block", className)}
    >
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

        {/* Video count */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}

        {/* Progress overlay */}
        {course.isEnrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50">
            <div
              className={cn(
                "h-full transition-all",
                isCompleted ? "bg-gray-900" : "bg-brand-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="mt-3">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900">
          {course.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-400">
          {course.creator && (
            <span>{course.creator.name}</span>
          )}
          {course.creator && course.totalDurationMin > 0 && (
            <span className="text-gray-200">·</span>
          )}
          {course.totalDurationMin > 0 && (
            <span>
              {course.totalDurationMin >= 60
                ? `${Math.floor(course.totalDurationMin / 60)}시간 ${course.totalDurationMin % 60}분`
                : `${course.totalDurationMin}분`}
            </span>
          )}
        </div>
        {course.isEnrolled && !isCompleted && (
          <span className="mt-1 inline-block text-[11px] font-medium text-brand-500">
            {Math.round(progress)}% 진행
          </span>
        )}
        {isCompleted && (
          <span className="mt-1 inline-block text-[11px] font-medium text-gray-400">
            수강 완료
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Horizontal Section ───────────────────────────────────────────────────────

function CourseSection({
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
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
        <span className="text-[12px] tabular-nums text-gray-300">
          {courses.length}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide"
      >
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            className="w-[200px] flex-shrink-0"
          />
        ))}
      </div>
    </section>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-[14px] font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-[13px] text-gray-400">{desc}</p>
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

  const isSearching = debouncedSearch.length > 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
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

  const enrolledCourses = useMemo(
    () => courses.filter((c) => c.isEnrolled),
    [courses]
  );

  const subcategoryGroups = useMemo(() => {
    const rest = courses.filter((c) => !c.isEnrolled);
    const groups: Record<string, CourseItem[]> = {};
    for (const course of rest) {
      const cat = categorize(course.slug);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(course);
    }
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

  return (
    <div className="space-y-8">
      {/* Specialty header */}
      {userSpecialty && !isSearching && (
        <div className="flex items-baseline justify-between">
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">
            {userSpecialty.name}
          </h1>
          <Link
            href="/onboarding/specialty"
            className="text-[12px] text-gray-300 transition-colors hover:text-gray-500"
          >
            변경
          </Link>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <input
          type="search"
          placeholder={t("searchCourses")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-[14px] text-gray-900 shadow-none ring-1 ring-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
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
        <div className="py-16 text-center">
          <p className="text-[13px] text-gray-400">{error}</p>
          <button
            onClick={() => fetchCourses(userSpecialty?.id)}
            className="mt-4 text-[13px] font-medium text-gray-900 hover:text-gray-600"
          >
            {tc("tryAgain")}
          </button>
        </div>
      ) : isSearching ? (
        /* Search results */
        <div className="space-y-5">
          <p className="text-[13px] text-gray-400">
            {courses.length}개의 결과
          </p>
          {courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} />
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
        /* Default view */
        <div className="space-y-10">
          {enrolledCourses.length > 0 && (
            <CourseSection
              title={t("myCourses")}
              courses={enrolledCourses}
            />
          )}

          {subcategoryGroups.map((g) => (
            <CourseSection
              key={g.key}
              title={g.label}
              courses={g.courses}
            />
          ))}

          {enrolledCourses.length === 0 && subcategoryGroups.length === 0 && courses.length === 0 && (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          )}

          {enrolledCourses.length === 0 && subcategoryGroups.length === 0 && courses.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
