"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Film,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Video,
  Wand2,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Types ───────────────────────────────────────────────────────────

interface Stats {
  total: number;
  inProgress: number;
  awaitingReview: number;
  completedThisMonth: number;
  totalCostUsd: number;
}

interface JobListItem {
  id: string;
  method: "AI_GENERATED" | "FACE_SWAP";
  provider: string;
  status: string;
  script?: { id: string; title: string } | null;
  lesson?: { translations: { title: string }[] } | null;
  course?: { id: string; translations: { title: string }[] } | null;
  courseId?: string | null;
  batchId?: string | null;
  estimatedCostUsd?: number | null;
  durationSec?: number | null;
  createdAt: string;
}

interface CourseOption {
  id: string;
  title: string;
}

// ─── Status badge helper ────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SCRIPT_GENERATING: "bg-brand-50 text-brand-700",
  SCRIPT_REVIEW: "bg-amber-50 text-amber-700",
  QUEUED: "bg-blue-50 text-blue-700",
  RENDERING: "bg-brand-50 text-brand-700",
  FACE_SWAPPING: "bg-brand-50 text-brand-700",
  POST_PROCESSING: "bg-brand-50 text-brand-700",
  REVIEW: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-accent-50 text-accent-700",
  FAILED: "bg-red-50 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  return method === "AI_GENERATED" ? (
    <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700">
      <Wand2 className="h-3 w-3" />
      AI Generated
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-cyan-50 px-1.5 py-0.5 text-xs font-medium text-cyan-700">
      <Video className="h-3 w-3" />
      Face Swap
    </span>
  );
}

// ─── Main page ──────────────────────────────────────────────────────

export default function VideoProductionDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCourseId, setFilterCourseId] = useState<string>("");
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);

  // Fetch course options for filter
  const fetchCourseOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/courses?pageSize=100");
      const json = await res.json();
      if (json.data) {
        setCourseOptions(
          json.data.map(
            (c: { id: string; translations: { title: string }[] }) => ({
              id: c.id,
              title: c.translations?.[0]?.title || "Untitled",
            })
          )
        );
      }
    } catch {
      // Silent
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/video-production/stats");
      const json = await res.json();
      if (json.data) setStats(json.data);
    } catch {
      // Stats are non-critical
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (filterMethod) params.set("method", filterMethod);
      if (filterStatus) params.set("status", filterStatus);
      if (filterCourseId) params.set("courseId", filterCourseId);
      if (search) params.set("search", search);

      const res = await fetch(
        `/api/v1/admin/video-production/jobs?${params.toString()}`
      );
      const json = await res.json();
      if (json.data) {
        setJobs(json.data);
        setTotal(json.pagination?.total || 0);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterMethod, filterStatus, filterCourseId, search]);

  useEffect(() => {
    fetchStats();
    fetchJobs();
    fetchCourseOptions();
  }, [fetchStats, fetchJobs, fetchCourseOptions]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Studio</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI video production pipeline — generate, review, and publish
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/video-production/avatars">
            <Button variant="outline" className="gap-2">
              <Video className="h-4 w-4" />
              Avatar Library
            </Button>
          </Link>
          <Link href="/admin/video-production/new">
            <Button className="gap-2 bg-brand-500 hover:bg-brand-600">
              <Plus className="h-4 w-4" />
              New Video Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats?.total ?? "—"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Film className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-brand-600">
                  {stats?.inProgress ?? "—"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                <Loader2 className="h-5 w-5 text-brand-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Awaiting Review
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {stats?.awaitingReview ?? "—"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Completed This Month
                </p>
                <p className="mt-1 text-2xl font-bold text-accent-600">
                  {stats?.completedThisMonth ?? "—"}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                <CheckCircle2 className="h-5 w-5 text-accent-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by script title or job ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select
              value={filterMethod}
              onChange={(e) => {
                setFilterMethod(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">All Methods</option>
              <option value="AI_GENERATED">AI Generated</option>
              <option value="FACE_SWAP">Face Swap</option>
            </select>
            <select
              value={filterCourseId}
              onChange={(e) => {
                setFilterCourseId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">All Courses</option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCRIPT_REVIEW">Script Review</option>
              <option value="QUEUED">Queued</option>
              <option value="RENDERING">Rendering</option>
              <option value="FACE_SWAPPING">Face Swapping</option>
              <option value="REVIEW">Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStats();
                fetchJobs();
              }}
              className="gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Production Jobs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center">
              <Film className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No video jobs found</p>
              <Link href="/admin/video-production/new">
                <Button className="mt-4 gap-2 bg-brand-500 hover:bg-brand-600" size="sm">
                  <Plus className="h-4 w-4" />
                  Create your first video
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">
                      <span className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500">Method</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Title / Lesson</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Provider</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Cost</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Created</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3">
                        <MethodBadge method={job.method} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate font-medium text-gray-900">
                          {job.script?.title ||
                            job.lesson?.translations?.[0]?.title ||
                            "Untitled"}
                        </div>
                        {job.course?.translations?.[0]?.title && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                            <BookOpen className="h-3 w-3" />
                            <Link
                              href={`/admin/courses/${job.courseId}/edit`}
                              className="hover:text-brand-600 hover:underline"
                            >
                              {job.course.translations[0].title}
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {job.provider.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {job.estimatedCostUsd
                          ? `$${job.estimatedCostUsd.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/video-production/${job.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 text-brand-600">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-1">
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
        </CardContent>
      </Card>
    </div>
  );
}
