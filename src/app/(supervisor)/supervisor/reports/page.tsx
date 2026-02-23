"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  BarChart3,
  Users,
  Clock,
  FileDown,
  CalendarPlus,
  TrendingUp,
  Target,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ReportType, ExportFormat, ScheduleFrequency } from "@/types/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportRow {
  learnerId: string;
  learnerName: string;
  program: string;
  progressPercent: number;
  averageScore: number;
  hoursSpent: number;
  tasksCompleted: number;
  lastActiveAt: string | null;
  status: string;
}

interface SummaryStats {
  totalLearners: number;
  averageCompletion: number;
  averageScore: number;
  totalHours: number;
  certificatesIssued: number;
}

interface GeneratedReport {
  type: ReportType;
  title: string;
  dateFrom: string;
  dateTo: string;
  summary: SummaryStats;
  rows: ReportRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROGRAMS = [
  { id: "all", label: "All Programs" },
  { id: "pct", label: "Primary Care Training" },
  { id: "ch", label: "Community Health" },
  { id: "er", label: "Emergency Response" },
];

const REPORT_TYPES: { value: ReportType; label: string; icon: typeof FileText; description: string }[] = [
  {
    value: "PROGRESS",
    label: "Progress Report",
    icon: BarChart3,
    description: "Learner completion rates and course progression",
  },
  {
    value: "COMPETENCY",
    label: "Competency Report",
    icon: Target,
    description: "Skill assessment levels and competency gaps",
  },
  {
    value: "ATTENDANCE",
    label: "Attendance Report",
    icon: Users,
    description: "Login frequency, session duration, and engagement",
  },
  {
    value: "IMPACT",
    label: "Impact Report",
    icon: TrendingUp,
    description: "KOICA outcomes, pre/post scores, and ROI analysis",
  },
];

const SCHEDULE_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ROWS: ReportRow[] = [
  {
    learnerId: "l1",
    learnerName: "Amina Yusuf",
    program: "Primary Care Training",
    progressPercent: 82,
    averageScore: 85,
    hoursSpent: 34.5,
    tasksCompleted: 8,
    lastActiveAt: "2026-02-24",
    status: "Active",
  },
  {
    learnerId: "l2",
    learnerName: "Jean-Pierre Habimana",
    program: "Primary Care Training",
    progressPercent: 45,
    averageScore: 68,
    hoursSpent: 18.2,
    tasksCompleted: 3,
    lastActiveAt: "2026-02-23",
    status: "At Risk",
  },
  {
    learnerId: "l3",
    learnerName: "Fatima Diallo",
    program: "Community Health",
    progressPercent: 71,
    averageScore: 78,
    hoursSpent: 28.0,
    tasksCompleted: 6,
    lastActiveAt: "2026-02-24",
    status: "Active",
  },
  {
    learnerId: "l4",
    learnerName: "Samuel Okonkwo",
    program: "Primary Care Training",
    progressPercent: 93,
    averageScore: 92,
    hoursSpent: 42.1,
    tasksCompleted: 11,
    lastActiveAt: "2026-02-24",
    status: "Active",
  },
  {
    learnerId: "l5",
    learnerName: "Grace Mutoni",
    program: "Community Health",
    progressPercent: 38,
    averageScore: 55,
    hoursSpent: 12.5,
    tasksCompleted: 2,
    lastActiveAt: "2026-02-21",
    status: "Inactive",
  },
  {
    learnerId: "l6",
    learnerName: "Ibrahim Keita",
    program: "Emergency Response",
    progressPercent: 56,
    averageScore: 73,
    hoursSpent: 22.8,
    tasksCompleted: 5,
    lastActiveAt: "2026-02-24",
    status: "Active",
  },
];

const MOCK_SUMMARY: SummaryStats = {
  totalLearners: 24,
  averageCompletion: 64,
  averageScore: 75,
  totalHours: 158,
  certificatesIssued: 5,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SupervisorReportsPage() {
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-02-24");
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("PROGRESS");
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>("WEEKLY");
  const [scheduleEmail, setScheduleEmail] = useState("");

  // Generate report
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      // In production:
      // const res = await fetch("/api/v1/reports/generate", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     type: selectedReportType,
      //     programId: selectedProgram === "all" ? undefined : selectedProgram,
      //     dateFrom,
      //     dateTo,
      //   }),
      // });
      // const json = await res.json();
      // setReport(json.data);

      await new Promise((r) => setTimeout(r, 600));

      const typeLabel = REPORT_TYPES.find((t) => t.value === selectedReportType)?.label ?? "Report";
      const programLabel = PROGRAMS.find((p) => p.id === selectedProgram)?.label ?? "All Programs";

      setReport({
        type: selectedReportType,
        title: `${typeLabel} - ${programLabel}`,
        dateFrom,
        dateTo,
        summary: MOCK_SUMMARY,
        rows: MOCK_ROWS,
      });
    } catch {
      // Error handling
    } finally {
      setIsGenerating(false);
    }
  }, [selectedReportType, selectedProgram, dateFrom, dateTo]);

  // Export handlers
  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!report) return;

      if (format === "CSV") {
        const header = "Name,Program,Progress,Score,Hours,Tasks,Last Active,Status\n";
        const rows = report.rows
          .map(
            (r) =>
              `"${r.learnerName}","${r.program}",${r.progressPercent}%,${r.averageScore}%,${r.hoursSpent},${r.tasksCompleted},"${r.lastActiveAt ?? ""}","${r.status}"`
          )
          .join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.type.toLowerCase()}-report-${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // PDF/XLSX export would use server-side generation
        alert(`${format} export would be generated server-side and downloaded.`);
      }
    },
    [report, dateTo]
  );

  // Schedule report
  const handleSchedule = useCallback(async () => {
    if (!scheduleEmail.trim()) return;

    try {
      // In production:
      // await fetch("/api/v1/reports/schedule", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     type: selectedReportType,
      //     frequency: scheduleFrequency,
      //     programId: selectedProgram === "all" ? undefined : selectedProgram,
      //     recipients: [scheduleEmail],
      //     format: "PDF",
      //   }),
      // });

      await new Promise((r) => setTimeout(r, 300));
      setShowSchedule(false);
      setScheduleEmail("");
    } catch {
      // Error handling
    }
  }, [selectedReportType, selectedProgram, scheduleFrequency, scheduleEmail]);

  // Summary stat card
  function SummaryStat({
    label,
    value,
    icon: Icon,
    accent,
  }: {
    label: string;
    value: string | number;
    icon: typeof Users;
    accent: string;
  }) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              accent.includes("accent")
                ? "bg-accent-50"
                : accent.includes("brand")
                  ? "bg-brand-50"
                  : accent.includes("purple")
                    ? "bg-purple-50"
                    : accent.includes("amber")
                      ? "bg-amber-50"
                      : "bg-green-50"
            )}
          >
            <Icon className={cn("h-5 w-5", accent)} />
          </div>
          <div>
            <p className={cn("text-2xl font-bold", accent)}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">
            Generate and export program reports with learner analytics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSchedule((v) => !v)}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Schedule Report
        </Button>
      </div>

      {/* Schedule recurring report panel */}
      {showSchedule && (
        <Card className="border-accent-200 bg-accent-50/30">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Schedule Recurring Report
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="sched-freq" className="text-xs">
                  Frequency
                </Label>
                <select
                  id="sched-freq"
                  value={scheduleFrequency}
                  onChange={(e) =>
                    setScheduleFrequency(e.target.value as ScheduleFrequency)
                  }
                  className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <Label htmlFor="sched-email" className="text-xs">
                  Recipient Email
                </Label>
                <Input
                  id="sched-email"
                  type="email"
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  placeholder="supervisor@example.com"
                  className="mt-1"
                />
              </div>
              <Button size="sm" onClick={handleSchedule}>
                Save Schedule
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSchedule(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report configuration */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Program selector */}
            <div>
              <Label htmlFor="program" className="text-xs">
                Program
              </Label>
              <select
                id="program"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                aria-label="Select program"
              >
                {PROGRAMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <Label htmlFor="date-from" className="text-xs">
                From
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs">
                To
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Report type */}
            <div>
              <Label htmlFor="report-type" className="text-xs">
                Report Type
              </Label>
              <select
                id="report-type"
                value={selectedReportType}
                onChange={(e) =>
                  setSelectedReportType(e.target.value as ReportType)
                }
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                aria-label="Report type"
              >
                {REPORT_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="ml-auto"
            >
              {isGenerating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report type cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.value}
              onClick={() => setSelectedReportType(rt.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all hover:shadow-md",
                selectedReportType === rt.value
                  ? "border-accent-400 bg-accent-50 ring-1 ring-accent-400"
                  : "border-gray-100 bg-white"
              )}
              aria-pressed={selectedReportType === rt.value}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  selectedReportType === rt.value
                    ? "text-accent-600"
                    : "text-gray-400"
                )}
              />
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {rt.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{rt.description}</p>
            </button>
          );
        })}
      </div>

      {/* Generated report */}
      {report && (
        <div className="space-y-6" role="region" aria-label="Generated report">
          {/* Report header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {report.title}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date(report.dateFrom).toLocaleDateString()} -{" "}
                {new Date(report.dateTo).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("CSV")}
              >
                <FileDown className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("PDF")}
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          {/* Summary stats cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryStat
              label="Total Learners"
              value={report.summary.totalLearners}
              icon={Users}
              accent="text-accent-600"
            />
            <SummaryStat
              label="Avg. Completion"
              value={`${report.summary.averageCompletion}%`}
              icon={BarChart3}
              accent="text-brand-600"
            />
            <SummaryStat
              label="Avg. Score"
              value={`${report.summary.averageScore}%`}
              icon={Target}
              accent="text-purple-600"
            />
            <SummaryStat
              label="Total Hours"
              value={report.summary.totalHours}
              icon={Clock}
              accent="text-amber-600"
            />
            <SummaryStat
              label="Certificates"
              value={report.summary.certificatesIssued}
              icon={GraduationCap}
              accent="text-green-600"
            />
          </div>

          {/* Data table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Learner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Program
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Progress
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Avg Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Hours
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Tasks
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Last Active
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr
                        key={row.learnerId}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.learnerName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.program}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={row.progressPercent}
                              className="h-1.5 w-16"
                            />
                            <span className="text-xs font-medium text-gray-600">
                              {row.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              row.averageScore >= 80
                                ? "text-green-600"
                                : row.averageScore >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                            )}
                          >
                            {row.averageScore}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.hoursSpent.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {row.tasksCompleted}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {row.lastActiveAt ?? "Never"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              row.status === "Active"
                                ? "default"
                                : row.status === "At Risk"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {row.status}
                          </Badge>
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

      {/* Empty state */}
      {!report && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-500">
              No report generated yet
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Select your parameters above and click Generate Report
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
