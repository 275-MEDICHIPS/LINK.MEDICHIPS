"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  Send,
  ClipboardPlus,
  AlertTriangle,
  Flame,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { RiskFlagType } from "@/types/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LearnerRow {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  program: string;
  progressPercent: number;
  lastActiveAt: string | null;
  currentStreak: number;
  enrolledCourses: number;
  completedCourses: number;
  pendingTasks: number;
  riskFlags: { type: RiskFlagType; severity: "low" | "medium" | "high"; message: string }[];
}

interface LearnerDetail {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  program: string;
  progressPercent: number;
  currentStreak: number;
  courseProgress: {
    courseId: string;
    courseTitle: string;
    progressPercent: number;
    modulesCompleted: number;
    totalModules: number;
  }[];
  recentQuizScores: {
    quizTitle: string;
    score: number;
    maxScore: number;
    date: string;
    passed: boolean;
  }[];
  taskTimeline: {
    taskTitle: string;
    status: string;
    date: string;
  }[];
  competencies: {
    name: string;
    level: number;
    maxLevel: number;
  }[];
}

type SortField = "name" | "progress" | "lastActive" | "streak";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_LEARNERS: LearnerRow[] = [
  {
    id: "l1",
    name: "Amina Yusuf",
    email: "amina@example.com",
    program: "Primary Care Training",
    progressPercent: 82,
    lastActiveAt: "2026-02-24T08:30:00Z",
    currentStreak: 12,
    enrolledCourses: 3,
    completedCourses: 1,
    pendingTasks: 1,
    riskFlags: [],
  },
  {
    id: "l2",
    name: "Jean-Pierre Habimana",
    email: "jp@example.com",
    program: "Primary Care Training",
    progressPercent: 45,
    lastActiveAt: "2026-02-23T14:15:00Z",
    currentStreak: 3,
    enrolledCourses: 2,
    completedCourses: 0,
    pendingTasks: 2,
    riskFlags: [
      { type: "LOW_PROGRESS", severity: "medium", message: "Below 50% completion" },
    ],
  },
  {
    id: "l3",
    name: "Fatima Diallo",
    program: "Community Health",
    progressPercent: 71,
    lastActiveAt: "2026-02-24T09:00:00Z",
    currentStreak: 7,
    enrolledCourses: 2,
    completedCourses: 1,
    pendingTasks: 0,
    riskFlags: [
      { type: "OVERDUE_TASKS", severity: "high", message: "1 overdue task" },
    ],
  },
  {
    id: "l4",
    name: "Samuel Okonkwo",
    program: "Primary Care Training",
    progressPercent: 93,
    lastActiveAt: "2026-02-24T07:45:00Z",
    currentStreak: 21,
    enrolledCourses: 3,
    completedCourses: 2,
    pendingTasks: 0,
    riskFlags: [],
  },
  {
    id: "l5",
    name: "Grace Mutoni",
    program: "Community Health",
    progressPercent: 38,
    lastActiveAt: "2026-02-21T11:00:00Z",
    currentStreak: 0,
    enrolledCourses: 1,
    completedCourses: 0,
    pendingTasks: 3,
    riskFlags: [
      { type: "INACTIVE", severity: "high", message: "No activity for 3 days" },
      { type: "STREAK_BROKEN", severity: "low", message: "Streak lost" },
    ],
  },
  {
    id: "l6",
    name: "Ibrahim Keita",
    program: "Emergency Response",
    progressPercent: 56,
    lastActiveAt: "2026-02-24T10:20:00Z",
    currentStreak: 5,
    enrolledCourses: 2,
    completedCourses: 0,
    pendingTasks: 1,
    riskFlags: [],
  },
];

const MOCK_DETAIL: LearnerDetail = {
  id: "l1",
  name: "Amina Yusuf",
  email: "amina@example.com",
  program: "Primary Care Training",
  progressPercent: 82,
  currentStreak: 12,
  courseProgress: [
    {
      courseId: "c1",
      courseTitle: "Basic Patient Care",
      progressPercent: 95,
      modulesCompleted: 4,
      totalModules: 5,
    },
    {
      courseId: "c2",
      courseTitle: "Medication Administration",
      progressPercent: 70,
      modulesCompleted: 3,
      totalModules: 4,
    },
    {
      courseId: "c3",
      courseTitle: "Infection Control",
      progressPercent: 45,
      modulesCompleted: 2,
      totalModules: 6,
    },
  ],
  recentQuizScores: [
    { quizTitle: "Vital Signs Quiz", score: 9, maxScore: 10, date: "2026-02-23", passed: true },
    { quizTitle: "Medication Dosage", score: 7, maxScore: 10, date: "2026-02-22", passed: true },
    { quizTitle: "Sterile Technique", score: 5, maxScore: 10, date: "2026-02-20", passed: false },
  ],
  taskTimeline: [
    { taskTitle: "Blood Pressure Measurement", status: "SUBMITTED", date: "2026-02-24" },
    { taskTitle: "Patient Assessment", status: "VERIFIED", date: "2026-02-22" },
    { taskTitle: "Hand Hygiene Procedure", status: "VERIFIED", date: "2026-02-20" },
    { taskTitle: "Wound Dressing", status: "IN_PROGRESS", date: "2026-02-19" },
  ],
  competencies: [
    { name: "Patient Assessment", level: 4, maxLevel: 5 },
    { name: "Medication Safety", level: 3, maxLevel: 5 },
    { name: "Infection Control", level: 2, maxLevel: 5 },
    { name: "Communication", level: 4, maxLevel: 5 },
    { name: "Emergency Response", level: 1, maxLevel: 5 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

function riskColor(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

const PROGRAMS = ["All Programs", "Primary Care Training", "Community Health", "Emergency Response"];
const STATUS_OPTIONS = ["All", "On Track", "At Risk", "Completed"];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SupervisorLearnersPage() {
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("All Programs");
  const [status, setStatus] = useState("All");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LearnerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Read initial selection from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setSelectedId(id);
  }, []);

  // Fetch detail when selection changes
  const fetchDetail = useCallback(async (learnerId: string) => {
    setDetailLoading(true);
    try {
      // const res = await fetch(`/api/v1/supervisor/learners/${learnerId}`);
      // const json = await res.json();
      // setDetail(json.data);
      await new Promise((r) => setTimeout(r, 200));
      setDetail({ ...MOCK_DETAIL, id: learnerId });
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, fetchDetail]);

  // Sorting
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  // Filter + sort learners
  const filteredLearners = useMemo(() => {
    let list = [...MOCK_LEARNERS];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.program.toLowerCase().includes(q)
      );
    }
    if (program !== "All Programs") {
      list = list.filter((l) => l.program === program);
    }
    if (status === "At Risk") {
      list = list.filter((l) => l.riskFlags.length > 0);
    } else if (status === "On Track") {
      list = list.filter((l) => l.riskFlags.length === 0 && l.progressPercent < 100);
    } else if (status === "Completed") {
      list = list.filter((l) => l.progressPercent >= 100);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "progress":
          cmp = a.progressPercent - b.progressPercent;
          break;
        case "lastActive":
          cmp =
            new Date(a.lastActiveAt ?? 0).getTime() -
            new Date(b.lastActiveAt ?? 0).getTime();
          break;
        case "streak":
          cmp = a.currentStreak - b.currentStreak;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [search, program, status, sortField, sortDir]);

  // Export stub
  const handleExport = useCallback(() => {
    const header = "Name,Program,Progress,Last Active,Streak,Risk Flags\n";
    const rows = filteredLearners
      .map(
        (l) =>
          `"${l.name}","${l.program}",${l.progressPercent}%,"${formatDate(l.lastActiveAt)}",${l.currentStreak},"${l.riskFlags.map((f) => f.message).join("; ")}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "learner-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLearners]);

  // Sort header helper
  function SortHeader({
    label,
    field,
    className,
  }: {
    label: string;
    field: SortField;
    className?: string;
  }) {
    return (
      <button
        onClick={() => handleSort(field)}
        className={cn(
          "flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500 hover:text-gray-900",
          className
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Learner Monitoring</h1>
          <p className="text-gray-500">
            Track progress, identify risks, and support your learners
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search learners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search learners"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
            aria-label="Filter by program"
          >
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Learner table */}
        <div className={cn("lg:col-span-2", selectedId && "lg:col-span-1")}>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left">
                        <SortHeader label="Name" field="name" />
                      </th>
                      {!selectedId && (
                        <th className="hidden px-4 py-3 text-left sm:table-cell">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Program
                          </span>
                        </th>
                      )}
                      <th className="px-4 py-3 text-left">
                        <SortHeader label="Progress" field="progress" />
                      </th>
                      {!selectedId && (
                        <>
                          <th className="hidden px-4 py-3 text-left md:table-cell">
                            <SortHeader label="Last Active" field="lastActive" />
                          </th>
                          <th className="hidden px-4 py-3 text-left md:table-cell">
                            <SortHeader label="Streak" field="streak" />
                          </th>
                          <th className="px-4 py-3 text-left">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Flags
                            </span>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLearners.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-sm text-gray-500"
                        >
                          No learners match your filters.
                        </td>
                      </tr>
                    )}
                    {filteredLearners.map((learner) => (
                      <tr
                        key={learner.id}
                        onClick={() =>
                          setSelectedId(
                            selectedId === learner.id ? null : learner.id
                          )
                        }
                        className={cn(
                          "cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50",
                          selectedId === learner.id && "bg-accent-50"
                        )}
                        role="row"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(
                              selectedId === learner.id ? null : learner.id
                            );
                          }
                        }}
                        aria-selected={selectedId === learner.id}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {learner.avatarUrl && (
                                <AvatarImage
                                  src={learner.avatarUrl}
                                  alt={learner.name}
                                />
                              )}
                              <AvatarFallback className="bg-accent-100 text-xs text-accent-700">
                                {getInitials(learner.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {learner.name}
                              </p>
                              {selectedId && (
                                <p className="truncate text-xs text-gray-500">
                                  {learner.program}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {!selectedId && (
                          <td className="hidden px-4 py-3 text-sm text-gray-600 sm:table-cell">
                            {learner.program}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={learner.progressPercent}
                              className="h-1.5 w-16"
                            />
                            <span className="text-xs font-medium text-gray-600">
                              {learner.progressPercent}%
                            </span>
                          </div>
                        </td>
                        {!selectedId && (
                          <>
                            <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                              {formatDate(learner.lastActiveAt)}
                            </td>
                            <td className="hidden px-4 py-3 md:table-cell">
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Flame className="h-3.5 w-3.5 text-orange-500" />
                                {learner.currentStreak}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {learner.riskFlags.length === 0 && (
                                  <span className="text-xs text-gray-400">--</span>
                                )}
                                {learner.riskFlags.map((flag, i) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                      riskColor(flag.severity)
                                    )}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {flag.type.replace("_", " ")}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">Learner Detail</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close detail panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {detailLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                  </div>
                )}
                {!detailLoading && detail && (
                  <div className="space-y-6">
                    {/* Profile header */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        {detail.avatarUrl && (
                          <AvatarImage
                            src={detail.avatarUrl}
                            alt={detail.name}
                          />
                        )}
                        <AvatarFallback className="bg-accent-100 text-lg text-accent-700">
                          {getInitials(detail.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {detail.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {detail.program}
                          {detail.email && (
                            <span> &middot; {detail.email}</span>
                          )}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Flame className="h-4 w-4 text-orange-500" />
                            {detail.currentStreak} day streak
                          </span>
                          <span>{detail.progressPercent}% overall</span>
                        </div>
                      </div>
                    </div>

                    {/* Course progress bars */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Course Progress
                      </h4>
                      <div className="space-y-3">
                        {detail.courseProgress.map((cp) => (
                          <div key={cp.courseId}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm text-gray-700">
                                {cp.courseTitle}
                              </span>
                              <span className="text-xs text-gray-500">
                                {cp.modulesCompleted}/{cp.totalModules} modules
                              </span>
                            </div>
                            <Progress
                              value={cp.progressPercent}
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent quiz scores */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Recent Quiz Scores
                      </h4>
                      <div className="space-y-2">
                        {detail.recentQuizScores.map((q, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm text-gray-700">
                                {q.quizTitle}
                              </p>
                              <p className="text-xs text-gray-400">{q.date}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  q.passed
                                    ? "text-green-600"
                                    : "text-red-600"
                                )}
                              >
                                {q.score}/{q.maxScore}
                              </span>
                              <Badge
                                variant={q.passed ? "default" : "destructive"}
                                className="text-[10px]"
                              >
                                {q.passed ? "Pass" : "Fail"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Task timeline */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Task Completion Timeline
                      </h4>
                      <div className="relative space-y-3 pl-4">
                        <div className="absolute bottom-0 left-1.5 top-0 w-px bg-gray-200" />
                        {detail.taskTimeline.map((t, i) => (
                          <div key={i} className="relative flex items-start gap-3">
                            <div
                              className={cn(
                                "absolute -left-2.5 mt-1.5 h-2 w-2 rounded-full",
                                t.status === "VERIFIED"
                                  ? "bg-green-500"
                                  : t.status === "SUBMITTED"
                                    ? "bg-amber-500"
                                    : "bg-gray-300"
                              )}
                            />
                            <div className="ml-2">
                              <p className="text-sm text-gray-700">
                                {t.taskTitle}
                              </p>
                              <p className="text-xs text-gray-400">
                                {t.status} &middot; {t.date}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Competency assessment */}
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Competency Assessment
                      </h4>
                      <div className="space-y-2">
                        {detail.competencies.map((c, i) => (
                          <div key={i}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm text-gray-700">
                                {c.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                Level {c.level}/{c.maxLevel}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {Array.from({ length: c.maxLevel }).map((_, j) => (
                                <div
                                  key={j}
                                  className={cn(
                                    "h-2 flex-1 rounded-full",
                                    j < c.level
                                      ? "bg-accent-500"
                                      : "bg-gray-200"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 border-t border-gray-100 pt-4">
                      <Button variant="outline" className="flex-1">
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </Button>
                      <Button className="flex-1">
                        <ClipboardPlus className="mr-2 h-4 w-4" />
                        Assign Task
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
