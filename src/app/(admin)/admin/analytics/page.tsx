"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Award,
  DollarSign,
  Globe,
  Download,
  Activity,
  Loader2,
  AlertCircle,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "operational" | "impact";

interface OperationalData {
  totalLearners: number;
  activeLearners: number;
  totalCourses: number;
  publishedCourses: number;
  avgCompletionPct: number;
  pendingReviews: number;
}

interface ImpactMetric {
  country?: string;
  code?: string;
  programName?: string;
  trained?: number;
  costPerWorker?: number;
  competencyRate?: number;
}

interface ImpactData {
  metrics: ImpactMetric[];
  totalCost: number;
  costPerWorker: number;
  totalOutcomes: number;
  competencyRate: number;
  completionsByProgram: { programName: string; completions: number }[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [view, setView] = useState<ViewMode>("operational");
  const [opData, setOpData] = useState<OperationalData | null>(null);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (type: ViewMode) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/admin/analytics?type=${type}`);
      const json = await res.json();
      if (json.data) {
        if (type === "operational") {
          setOpData(json.data);
        } else {
          setImpactData(json.data);
        }
      } else {
        setError("Failed to load analytics data");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(view);
  }, [view, fetchData]);

  const handleViewChange = (newView: ViewMode) => {
    setView(newView);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform performance metrics and KOICA impact reporting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => handleViewChange("operational")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "operational"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Operational
            </button>
            <button
              onClick={() => handleViewChange("impact")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "impact"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              KOICA Impact
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-10 w-10 text-red-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchData(view)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Operational View */}
          {view === "operational" && opData && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Total Learners</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {opData.totalLearners.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-3">
                        <Users className="h-5 w-5 text-brand-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Active Learners</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {opData.activeLearners.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {opData.totalLearners > 0
                            ? `${((opData.activeLearners / opData.totalLearners) * 100).toFixed(1)}% of total`
                            : ""}
                        </p>
                      </div>
                      <div className="rounded-xl bg-accent-50 p-3">
                        <GraduationCap className="h-5 w-5 text-accent-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Published Courses</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {opData.publishedCourses}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          of {opData.totalCourses} total
                        </p>
                      </div>
                      <div className="rounded-xl bg-purple-50 p-3">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Avg Completion Rate</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {opData.avgCompletionPct.toFixed(1)}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3">
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Content Status Overview */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Content Status</CardTitle>
                    <CardDescription>Course publication overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Published</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-accent-500"
                              style={{
                                width: `${opData.totalCourses > 0 ? (opData.publishedCourses / opData.totalCourses) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {opData.publishedCourses}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">In Draft/Review</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{
                                width: `${opData.totalCourses > 0 ? ((opData.totalCourses - opData.publishedCourses) / opData.totalCourses) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {opData.totalCourses - opData.publishedCourses}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pending Reviews</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-700">
                          {opData.pendingReviews}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Engagement Summary</CardTitle>
                    <CardDescription>Platform engagement metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-6">
                      <BarChart3 className="h-10 w-10 text-gray-200" />
                      <p className="mt-3 text-sm font-medium text-gray-500">Coming soon</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Time-series engagement data is under development
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* KOICA Impact View */}
          {view === "impact" && impactData && (
            <div className="space-y-6">
              {/* Impact KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Total Outcomes</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {impactData.totalOutcomes.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-3">
                        <Users className="h-5 w-5 text-brand-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Cost per Worker</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          ${impactData.costPerWorker.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-accent-50 p-3">
                        <DollarSign className="h-5 w-5 text-accent-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Competency Rate</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {impactData.competencyRate.toFixed(1)}%
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent-600">
                          {impactData.competencyRate >= 80 ? (
                            <>
                              <TrendingUp className="h-3 w-3" /> Above 80% target
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-red-600" /> Below 80% target
                            </>
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-purple-50 p-3">
                        <Award className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Programs Tracked</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {impactData.metrics.length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3">
                        <Globe className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Programs Table */}
              {impactData.metrics.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Programs by Region</CardTitle>
                        <CardDescription>KOICA healthcare training impact</CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Program / Country
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Workers Trained
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Cost / Worker
                            </th>
                            <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                              Competency Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {impactData.metrics.map((m, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-50 hover:bg-gray-50/50"
                            >
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  {m.code && (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                                      {m.code}
                                    </span>
                                  )}
                                  <span className="text-sm font-medium text-gray-900">
                                    {m.programName || m.country || "Unknown"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                                {(m.trained || 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-600">
                                ${(m.costPerWorker || 0).toFixed(2)}
                              </td>
                              <td className="hidden px-3 py-3 md:table-cell">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      className={`h-full rounded-full ${
                                        (m.competencyRate || 0) >= 85
                                          ? "bg-accent-500"
                                          : (m.competencyRate || 0) >= 80
                                            ? "bg-amber-500"
                                            : "bg-red-500"
                                      }`}
                                      style={{ width: `${m.competencyRate || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {(m.competencyRate || 0).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completions by Program */}
              {impactData.completionsByProgram && impactData.completionsByProgram.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Completions by Program</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {impactData.completionsByProgram.map((p, idx) => {
                        const maxCompletions = Math.max(
                          ...impactData.completionsByProgram.map((x) => x.completions)
                        );
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-40 truncate text-sm text-gray-700">
                              {p.programName}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-brand-500"
                                style={{
                                  width: `${maxCompletions > 0 ? (p.completions / maxCompletions) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {p.completions}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Export section */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Generate KOICA Impact Report
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Download a comprehensive report with all metrics and country-level
                        breakdowns suitable for KOICA stakeholder presentations.
                      </p>
                    </div>
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Export Full Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state for impact when no data */}
          {view === "impact" && !impactData && !loading && !error && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Globe className="h-12 w-12 text-gray-200" />
                <p className="mt-3 text-sm font-medium text-gray-500">No impact data available</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
