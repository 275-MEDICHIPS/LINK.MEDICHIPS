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
  Clock,
  CheckCircle2,
  AlertTriangle,
  ListChecks,
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
  return <div className={cn("animate-pulse rounded-lg bg-gray-200/60", className)} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[52px] flex-1 rounded-xl" />)}
      </div>
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[200px] w-[200px] flex-shrink-0 rounded-2xl" />
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Status Chip (Opus style) ────────────────────────────────────────────────

function StatusChip({
  icon: Icon,
  label,
  count,
  active,
  variant,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  active: boolean;
  variant: "default" | "progress" | "done";
  onClick: () => void;
}) {
  const styles = {
    default: {
      bg: active ? "bg-gray-100 ring-gray-300" : "bg-white ring-gray-100",
      icon: "text-gray-400",
    },
    progress: {
      bg: active ? "bg-brand-50 ring-brand-200" : "bg-white ring-gray-100",
      icon: "text-brand-500",
    },
    done: {
      bg: active ? "bg-accent-50 ring-accent-200" : "bg-white ring-gray-100",
      icon: "text-accent-500",
    },
  };
  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2.5 ring-1 transition-all",
        s.bg
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", s.icon)} />
        <span className="text-[11px] text-gray-500">{label}</span>
      </div>
      <span className="text-[18px] font-bold tabular-nums text-gray-900">{count}</span>
    </button>
  );
}

// ─── Horizontal Scroll Card ──────────────────────────────────────────────────

function ScrollCourseCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block w-[200px] flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-6 w-6 text-gray-200" />
          </div>
        )}

        {/* Video count */}
        {course.videoCount > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}

        {/* Progress bar */}
        {course.isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10">
            <div
              className={cn("h-full", isCompleted ? "bg-accent-500" : "bg-brand-400")}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-[12px] font-semibold leading-snug text-gray-900">
          {course.title}
        </h3>
        <p className="mt-1 text-[10px] text-gray-400">
          {course.creator?.name}
        </p>
        {course.isEnrolled && (
          <p className={cn(
            "mt-1 text-[10px] font-medium",
            isCompleted ? "text-accent-600" : "text-gray-400"
          )}>
            {isCompleted ? "완료" : `${Math.round(progress)}%`}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Horizontal Scroll Section ────────────────────────────────────────────────

function HorizontalSection({
  title,
  courses,
}: {
  title: string;
  courses: CourseItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-gray-900">{title}</h2>
        <span className="flex items-center gap-0.5 text-[12px] font-medium text-gray-400">
          전체보기
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {courses.map((c) => (
          <div key={c.id} style={{ scrollSnapAlign: "start" }}>
            <ScrollCourseCard course={c} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Grid Card (for search results) ──────────────────────────────────────────

function GridCourseCard({ course }: { course: CourseItem }) {
  const progress = course.progressPct ?? 0;
  const isCompleted = progress >= 100;
  const duration = formatDuration(course.totalDurationMin);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition-all hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-50">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-6 w-6 text-gray-200" />
          </div>
        )}
        {course.videoCount > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
            <Video className="h-2.5 w-2.5" />
            {course.videoCount}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-[12px] font-semibold leading-snug text-gray-900">
          {course.title}
        </h3>
        <p className="mt-1 text-[10px] text-gray-400">
          {[course.creator?.name, duration].filter(Boolean).join(" · ")}
        </p>
        {course.isEnrolled && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn("h-full rounded-full", isCompleted ? "bg-accent-500" : "bg-brand-400")}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={cn(
              "text-[9px] font-medium tabular-nums",
              isCompleted ? "text-accent-600" : "text-gray-400"
            )}>
              {isCompleted ? "완료" : `${Math.round(progress)}%`}
            </span>
          </div>
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
  const [statusFilter, setStatusFilter] = useState<"all" | "inProgress" | "completed">("all");

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

  // Compute stats & sections
  const { stats, sections } = useMemo(() => {
    const enrolled = courses.filter((c) => c.isEnrolled);
    const inProgress = enrolled.filter((c) => (c.progressPct ?? 0) > 0 && (c.progressPct ?? 0) < 100);
    const completed = enrolled.filter((c) => (c.progressPct ?? 0) >= 100);
    const notStarted = courses.filter((c) => !c.isEnrolled || (c.progressPct ?? 0) === 0);

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
      secs.push({ key: "other", label: "기타", courses: groups["other"] });
    }

    return {
      stats: {
        total: courses.length,
        inProgress: inProgress.length,
        completed: completed.length,
        notStarted: notStarted.length,
      },
      sections: secs,
    };
  }, [courses]);

  // Filter courses by status chip
  const filteredSections = useMemo(() => {
    if (statusFilter === "all") return sections;

    return sections
      .map((sec) => ({
        ...sec,
        courses: sec.courses.filter((c) => {
          const p = c.progressPct ?? 0;
          if (statusFilter === "inProgress") return c.isEnrolled && p > 0 && p < 100;
          if (statusFilter === "completed") return c.isEnrolled && p >= 100;
          return true;
        }),
      }))
      .filter((sec) => sec.courses.length > 0);
  }, [sections, statusFilter]);

  return (
    <div className="pb-8">
      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
        <input
          type="search"
          placeholder={t("searchCourses")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-10 text-[14px] text-gray-900 shadow-sm ring-1 ring-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all"
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
          <p className="mb-4 text-[12px] font-medium text-gray-400">
            검색 결과 <span className="tabular-nums text-gray-900">{courses.length}</span>개
          </p>
          {courses.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {courses.map((c) => <GridCourseCard key={c.id} course={c} />)}
            </div>
          ) : (
            <EmptyState title={t("noSearchResults")} desc={t("noSearchResultsDesc")} />
          )}
        </div>
      ) : (
        /* ─── Browse View (코스 탐색) ─── */
        <div className="space-y-6">
          {/* Header with specialty */}
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-bold text-gray-900">
              {userSpecialty ? userSpecialty.name : "코스 탐색"}
            </h1>
            {userSpecialty && (
              <Link
                href="/onboarding/specialty"
                className="flex items-center gap-0.5 text-[12px] font-medium text-gray-400 hover:text-brand-500"
              >
                변경
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* Status chips (Opus: Overdue / To do / Completed) */}
          <div className="flex gap-2.5">
            <StatusChip
              icon={AlertTriangle}
              label="미수강"
              count={stats.notStarted}
              active={statusFilter === "all"}
              variant="default"
              onClick={() => setStatusFilter("all")}
            />
            <StatusChip
              icon={ListChecks}
              label="수강 중"
              count={stats.inProgress}
              active={statusFilter === "inProgress"}
              variant="progress"
              onClick={() => setStatusFilter("inProgress")}
            />
            <StatusChip
              icon={CheckCircle2}
              label="완료"
              count={stats.completed}
              active={statusFilter === "completed"}
              variant="done"
              onClick={() => setStatusFilter("completed")}
            />
          </div>

          {/* Category Sections (horizontal scroll) */}
          {filteredSections.map((section) => (
            <HorizontalSection
              key={section.key}
              title={section.label}
              courses={section.courses}
            />
          ))}

          {/* No courses */}
          {courses.length === 0 && (
            <EmptyState
              title={t("noCoursesAvailable")}
              desc={t("noCoursesAvailableDesc")}
            />
          )}

          {/* Filtered empty */}
          {courses.length > 0 && filteredSections.length === 0 && statusFilter !== "all" && (
            <EmptyState
              title={statusFilter === "inProgress" ? "수강 중인 코스가 없습니다" : "완료한 코스가 없습니다"}
              desc="코스를 시작해보세요"
            />
          )}
        </div>
      )}
    </div>
  );
}
