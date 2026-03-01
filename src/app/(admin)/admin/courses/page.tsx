"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckSquare,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CourseStatus = "draft" | "review" | "published" | "archived";
type RiskLevel = "L1" | "L2" | "L3";

interface Course {
  id: string;
  title: string;
  status: CourseStatus;
  modules: number;
  enrollments: number;
  riskLevel: RiskLevel;
  updatedAt: string;
  author: string;
  specialty: string;
  thumbnailUrl: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiStatus(status: string): CourseStatus {
  switch (status) {
    case "PUBLISHED":
      return "published";
    case "IN_REVIEW":
    case "APPROVED":
      return "review";
    case "ARCHIVED":
      return "archived";
    default:
      return "draft";
  }
}

function apiStatusValue(status: CourseStatus | "all"): string | undefined {
  switch (status) {
    case "draft":
      return "DRAFT";
    case "review":
      return "IN_REVIEW";
    case "published":
      return "PUBLISHED";
    case "archived":
      return "ARCHIVED";
    default:
      return undefined;
  }
}

const statusConfig: Record<CourseStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  review: { label: "In Review", className: "bg-amber-50 text-amber-700" },
  published: { label: "Published", className: "bg-accent-50 text-accent-700" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500" },
};

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  L1: { label: "L1", className: "bg-green-50 text-green-700 border border-green-200" },
  L2: { label: "L2", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  L3: { label: "L3", className: "bg-red-50 text-red-700 border border-red-200" },
};

const GRADIENT_PRESETS = [
  { from: "#0ea5e9", to: "#6366f1" },
  { from: "#10b981", to: "#0d9488" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#8b5cf6", to: "#ec4899" },
  { from: "#06b6d4", to: "#3b82f6" },
  { from: "#f97316", to: "#eab308" },
];

function getGradient(title: string) {
  const idx = title.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENT_PRESETS.length;
  return GRADIENT_PRESETS[idx];
}

function CourseThumbnail({ course }: { course: Course }) {
  const gradient = getGradient(course.title);
  const initials = course.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

  if (course.thumbnailUrl) {
    return (
      <img
        src={course.thumbnailUrl}
        alt=""
        className="h-12 w-20 rounded-md object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md"
      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
    >
      <span className="text-xs font-bold text-white/90">{initials}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CourseStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = riskConfig[level];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function RowActions({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <Link
              href={`/admin/courses/${courseId}/edit`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        locale: "en",
      });
      const apiStatus = apiStatusValue(statusFilter);
      if (apiStatus) params.set("status", apiStatus);
      if (search) params.set("search", search);

      const res = await fetch(`/api/v1/courses?${params.toString()}`);
      const json = await res.json();

      if (json.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Course[] = json.data.map((c: any) => ({
          id: c.id,
          title: c.translations?.[0]?.title || "Untitled",
          status: mapApiStatus(c.status),
          modules: c._count?.modules || 0,
          enrollments: c._count?.enrollments || 0,
          riskLevel: (c.riskLevel || "L1") as RiskLevel,
          updatedAt: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
          author: c.specialtyTags?.[0]?.specialty?.name || "",
          specialty: c.specialtyTags?.[0]?.specialty?.name || "",
          thumbnailUrl: c.thumbnailUrl || null,
        }));
        setCourses(mapped);
        setTotal(json.pagination?.total || 0);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setPage(1);
      }, 300)
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === courses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(courses.map((c) => c.id)));
    }
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage medical education courses across all programs
          </p>
        </div>
        <Link href="/admin/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search courses by title..."
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Status
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {(["all", "draft", "review", "published", "archived"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setPage(1);
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-sm ${
                          statusFilter === s
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {s === "all" ? "All Statuses" : statusConfig[s].label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">
            {selectedIds.size} course{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              Archive
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          <p className="ml-2 text-sm text-gray-500">Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-500">No courses found</p>
          <p className="mt-1 text-xs text-gray-400">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first course to get started"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="space-y-3 md:hidden">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardContent className="p-3">
                  <Link
                    href={`/admin/courses/${course.id}/edit`}
                    className="flex items-start gap-3"
                  >
                    <CourseThumbnail course={course} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {course.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={course.status} />
                        <RiskBadge level={course.riskLevel} />
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                        <span>모듈 {course.modules}개</span>
                        <span>수강 {course.enrollments.toLocaleString()}</span>
                        <span>{course.updatedAt}</span>
                      </div>
                    </div>
                    <RowActions courseId={course.id} />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === courses.length && courses.length > 0}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="Select all courses"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Modules
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                      Enrollments
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Risk
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                      Updated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(course.id)}
                          onChange={() => toggleSelect(course.id)}
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${course.title}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/courses/${course.id}/edit`}
                          className="group flex items-center gap-3"
                        >
                          <CourseThumbnail course={course} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 group-hover:text-brand-600">
                              {course.title}
                            </p>
                            {course.specialty && (
                              <p className="truncate text-xs text-gray-500">
                                {course.specialty}
                              </p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={course.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {course.modules}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-gray-600 lg:table-cell">
                        {course.enrollments.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge level={course.riskLevel} />
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                        {course.updatedAt}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowActions courseId={course.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages || 1} ({total} courses)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-brand-50 text-brand-700">
                    {page}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Mobile Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between px-1 py-2 md:hidden">
              <p className="text-xs text-gray-500">
                {page} / {totalPages || 1} ({total})
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
