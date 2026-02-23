"use client";

import { useState, useMemo } from "react";
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
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockCourses: Course[] = [
  {
    id: "crs_001",
    title: "Emergency Triage Protocol",
    status: "published",
    modules: 6,
    enrollments: 342,
    riskLevel: "L3",
    updatedAt: "2026-02-22",
    author: "Dr. Kim",
    specialty: "Emergency Medicine",
  },
  {
    id: "crs_002",
    title: "Pediatric Assessment Fundamentals",
    status: "review",
    modules: 4,
    enrollments: 0,
    riskLevel: "L2",
    updatedAt: "2026-02-21",
    author: "Dr. Osei",
    specialty: "Pediatrics",
  },
  {
    id: "crs_003",
    title: "Wound Care Basics",
    status: "published",
    modules: 5,
    enrollments: 528,
    riskLevel: "L1",
    updatedAt: "2026-02-20",
    author: "Nurse Mpho",
    specialty: "General Nursing",
  },
  {
    id: "crs_004",
    title: "Infection Control in Resource-Limited Settings",
    status: "draft",
    modules: 3,
    enrollments: 0,
    riskLevel: "L2",
    updatedAt: "2026-02-19",
    author: "Dr. Tanaka",
    specialty: "Infectious Disease",
  },
  {
    id: "crs_005",
    title: "Maternal Health: Prenatal Care",
    status: "published",
    modules: 8,
    enrollments: 215,
    riskLevel: "L3",
    updatedAt: "2026-02-18",
    author: "Dr. Amina",
    specialty: "Obstetrics",
  },
  {
    id: "crs_006",
    title: "Basic Pharmacology for Nurses",
    status: "draft",
    modules: 7,
    enrollments: 0,
    riskLevel: "L2",
    updatedAt: "2026-02-17",
    author: "Dr. Park",
    specialty: "Pharmacology",
  },
  {
    id: "crs_007",
    title: "Mental Health First Aid",
    status: "review",
    modules: 4,
    enrollments: 0,
    riskLevel: "L1",
    updatedAt: "2026-02-16",
    author: "Dr. Williams",
    specialty: "Psychiatry",
  },
  {
    id: "crs_008",
    title: "Diabetes Management in Primary Care",
    status: "published",
    modules: 5,
    enrollments: 189,
    riskLevel: "L2",
    updatedAt: "2026-02-15",
    author: "Dr. Chen",
    specialty: "Endocrinology",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function CreateCourseDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create New Course</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="course-title" className="mb-1.5 block text-sm font-medium text-gray-700">
              Course Title
            </label>
            <Input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Emergency Triage Protocol"
            />
          </div>
          <div>
            <label htmlFor="course-specialty" className="mb-1.5 block text-sm font-medium text-gray-700">
              Specialty
            </label>
            <Input
              id="course-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g., Emergency Medicine"
            />
          </div>
          <div>
            <label htmlFor="risk-level" className="mb-1.5 block text-sm font-medium text-gray-700">
              Risk Level
            </label>
            <select
              id="risk-level"
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="L1">L1 - Low Risk</option>
              <option value="L2">L2 - Medium Risk</option>
              <option value="L3">L3 - High Risk</option>
            </select>
          </div>
          <div>
            <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-gray-700">
              Primary Language
            </label>
            <select
              id="language"
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="en">English</option>
              <option value="ko">Korean</option>
              <option value="fr">French</option>
              <option value="sw">Swahili</option>
              <option value="am">Amharic</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!title.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </div>
      </div>
    </div>
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    return mockCourses.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.author.toLowerCase().includes(search.toLowerCase()) ||
        c.specialty.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage medical education courses across all programs
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses by title, author, or specialty..."
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
        <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
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

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
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
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  Modules
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                  Enrollments
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">No courses found</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Create your first course to get started"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((course) => (
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
                        className="group"
                      >
                        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {course.specialty} &middot; {course.author}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={course.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 md:table-cell">
                      {course.modules}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 lg:table-cell">
                      {course.enrollments.toLocaleString()}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <RiskBadge level={course.riskLevel} />
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                      {course.updatedAt}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActions courseId={course.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing 1-{filtered.length} of {filtered.length} courses
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="bg-brand-50 text-brand-700">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <CreateCourseDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
