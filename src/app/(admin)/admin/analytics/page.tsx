"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Award,
  DollarSign,
  Globe,
  Download,
  BarChart3,
  Activity,
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

interface DauDataPoint {
  date: string;
  value: number;
}

interface CompletionDataPoint {
  month: string;
  completions: number;
}

interface ContentStatusData {
  status: string;
  count: number;
  color: string;
}

interface TopCourse {
  rank: number;
  title: string;
  completionRate: number;
  enrolled: number;
  completed: number;
}

interface CountryProgram {
  country: string;
  code: string;
  trained: number;
  costPerWorker: number;
  competencyRate: number;
  programs: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const dauData: DauDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: `Feb ${i + 1}`,
  value: Math.floor(80 + Math.random() * 120 + (i > 15 ? 40 : 0)),
}));

const completionData: CompletionDataPoint[] = [
  { month: "Sep", completions: 42 },
  { month: "Oct", completions: 58 },
  { month: "Nov", completions: 71 },
  { month: "Dec", completions: 63 },
  { month: "Jan", completions: 89 },
  { month: "Feb", completions: 112 },
];

const contentStatusData: ContentStatusData[] = [
  { status: "Published", count: 34, color: "bg-accent-500" },
  { status: "In Review", count: 7, color: "bg-amber-500" },
  { status: "Draft", count: 12, color: "bg-gray-400" },
  { status: "Archived", count: 5, color: "bg-gray-200" },
];

const topCourses: TopCourse[] = [
  { rank: 1, title: "Emergency Triage Protocol", completionRate: 94.2, enrolled: 342, completed: 322 },
  { rank: 2, title: "Wound Care Basics", completionRate: 91.5, enrolled: 528, completed: 483 },
  { rank: 3, title: "Infection Control", completionRate: 88.7, enrolled: 215, completed: 191 },
  { rank: 4, title: "Diabetes Management", completionRate: 85.3, enrolled: 189, completed: 161 },
  { rank: 5, title: "Pediatric Assessment", completionRate: 82.1, enrolled: 156, completed: 128 },
];

const countryPrograms: CountryProgram[] = [
  { country: "Ethiopia", code: "ET", trained: 520, costPerWorker: 12.40, competencyRate: 87.3, programs: 3 },
  { country: "Tanzania", code: "TZ", trained: 385, costPerWorker: 14.20, competencyRate: 84.1, programs: 2 },
  { country: "Kenya", code: "KE", trained: 264, costPerWorker: 11.80, competencyRate: 89.5, programs: 2 },
  { country: "Rwanda", code: "RW", trained: 142, costPerWorker: 15.60, competencyRate: 82.7, programs: 1 },
  { country: "Sudan", code: "SD", trained: 98, costPerWorker: 18.30, competencyRate: 78.4, programs: 1 },
];

const totalContentCount = contentStatusData.reduce((a, b) => a + b.count, 0);

// ---------------------------------------------------------------------------
// Chart components (CSS-only, no charting library)
// ---------------------------------------------------------------------------

function MiniLineChart({ data, height = 120 }: { data: DauDataPoint[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 flex h-full flex-col justify-between text-xs text-gray-400">
        <span>{max}</span>
        <span>{Math.floor((max + min) / 2)}</span>
        <span>{min}</span>
      </div>
      {/* Chart area */}
      <div className="ml-10 flex h-full items-end gap-[2px]">
        {data.map((d, i) => {
          const pct = ((d.value - min) / range) * 100;
          return (
            <div
              key={i}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t bg-brand-500/20 transition-colors group-hover:bg-brand-500/40"
                style={{ height: `${Math.max(pct, 5)}%` }}
              />
              <div
                className="absolute bottom-0 w-full rounded-t bg-brand-500 transition-colors group-hover:bg-brand-600"
                style={{ height: `${Math.max(pct, 5)}%`, maxHeight: "3px", marginBottom: `calc(${pct}% - 3px)` }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                {d.date}: {d.value}
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="ml-10 mt-1 flex justify-between text-xs text-gray-400">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function BarChart({ data }: { data: CompletionDataPoint[] }) {
  const max = Math.max(...data.map((d) => d.completions));

  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d) => {
        const pct = (d.completions / max) * 100;
        return (
          <div key={d.month} className="group flex flex-1 flex-col items-center">
            <div className="relative mb-1 w-full">
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
                {d.completions}
              </span>
            </div>
            <div
              className="w-full rounded-t-md bg-accent-500 transition-colors group-hover:bg-accent-600"
              style={{ height: `${Math.max(pct, 5)}%` }}
            />
            <span className="mt-2 text-xs text-gray-500">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ data }: { data: ContentStatusData[] }) {
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
          {data.map((d) => {
            const pct = (d.count / totalContentCount) * 100;
            const dashArray = `${pct} ${100 - pct}`;
            const dashOffset = -cumulative;
            cumulative += pct;

            const colorMap: Record<string, string> = {
              "bg-accent-500": "#10B981",
              "bg-amber-500": "#F59E0B",
              "bg-gray-400": "#9CA3AF",
              "bg-gray-200": "#E5E7EB",
            };

            return (
              <circle
                key={d.status}
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke={colorMap[d.color] || "#E5E7EB"}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{totalContentCount}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${d.color}`} />
            <span className="text-sm text-gray-600">{d.status}</span>
            <span className="ml-auto text-sm font-semibold text-gray-900">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [view, setView] = useState<ViewMode>("operational");

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
          {/* Toggle */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setView("operational")}
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
              onClick={() => setView("impact")}
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

      {/* Operational View */}
      {view === "operational" && (
        <div className="space-y-6">
          {/* DAU Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Daily Active Users</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {dauData[dauData.length - 1]?.value}
                  </p>
                  <p className="flex items-center gap-1 text-xs font-medium text-accent-600">
                    <TrendingUp className="h-3 w-3" /> +18% vs last period
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MiniLineChart data={dauData} height={160} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Completions Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course Completions</CardTitle>
                <CardDescription>Monthly trend</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChart data={completionData} />
              </CardContent>
            </Card>

            {/* Content Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content by Status</CardTitle>
                <CardDescription>All courses breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChart data={contentStatusData} />
              </CardContent>
            </Card>
          </div>

          {/* Top Courses Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Courses by Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Rank
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Course
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Completion Rate
                      </th>
                      <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                        Enrolled
                      </th>
                      <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                        Completed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCourses.map((course) => (
                      <tr
                        key={course.rank}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              course.rank <= 3
                                ? "bg-brand-50 text-brand-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {course.rank}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                          {course.title}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-accent-500"
                                style={{ width: `${course.completionRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {course.completionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2.5 text-sm text-gray-600 md:table-cell">
                          {course.enrolled.toLocaleString()}
                        </td>
                        <td className="hidden px-3 py-2.5 text-sm text-gray-600 md:table-cell">
                          {course.completed.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KOICA Impact View */}
      {view === "impact" && (
        <div className="space-y-6">
          {/* Impact KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Total Workers Trained</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">1,409</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent-600">
                      <TrendingUp className="h-3 w-3" /> +23% YoY
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
                    <p className="mt-2 text-3xl font-bold text-gray-900">$13.60</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent-600">
                      <TrendingDown className="h-3 w-3" /> -8% vs target
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
                    <p className="text-xs font-medium text-gray-500">Competency Achievement</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">85.7%</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent-600">
                      <TrendingUp className="h-3 w-3" /> Above 80% target
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
                    <p className="text-xs font-medium text-gray-500">Active Countries</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">5</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-600">
                      <Globe className="h-3 w-3" /> 9 programs
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <Globe className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Countries Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Programs by Country</CardTitle>
                  <CardDescription>KOICA healthcare training impact by region</CardDescription>
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
                        Country
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
                      <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                        Programs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {countryPrograms.map((cp) => (
                      <tr
                        key={cp.code}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                              {cp.code}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {cp.country}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                          {cp.trained.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">
                          ${cp.costPerWorker.toFixed(2)}
                        </td>
                        <td className="hidden px-3 py-3 md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${
                                  cp.competencyRate >= 85
                                    ? "bg-accent-500"
                                    : cp.competencyRate >= 80
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                                }`}
                                style={{ width: `${cp.competencyRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{cp.competencyRate}%</span>
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 text-sm text-gray-600 md:table-cell">
                          {cp.programs}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Export section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Generate KOICA Impact Report
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Download a comprehensive report with all metrics, charts, and country-level
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
    </div>
  );
}
