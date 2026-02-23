"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  ShieldCheck,
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Send,
  CalendarPlus,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (page-local, derived from API shapes)
// ---------------------------------------------------------------------------

interface DashboardStats {
  activeLearners: number;
  pendingVerifications: number;
  tasksDueToday: number;
  averageCompletion: number;
}

interface UrgentItem {
  id: string;
  type: "overdue_task" | "failed_verification";
  title: string;
  learnerName: string;
  dueDate: string | null;
  severity: "high" | "medium";
}

interface LearnerCard {
  id: string;
  name: string;
  avatarUrl?: string;
  progressPercent: number;
  lastActiveAt: string | null;
  program: string;
}

interface SubmissionItem {
  id: string;
  learnerName: string;
  learnerAvatarUrl?: string;
  taskTitle: string;
  submittedAt: string;
  evidenceCount: number;
}

// ---------------------------------------------------------------------------
// Mock data (replaced by API calls in production)
// ---------------------------------------------------------------------------

const MOCK_STATS: DashboardStats = {
  activeLearners: 24,
  pendingVerifications: 7,
  tasksDueToday: 3,
  averageCompletion: 68,
};

const MOCK_URGENT: UrgentItem[] = [
  {
    id: "u1",
    type: "overdue_task",
    title: "Wound Dressing Practical",
    learnerName: "Amina Yusuf",
    dueDate: "2026-02-20",
    severity: "high",
  },
  {
    id: "u2",
    type: "failed_verification",
    title: "Patient Assessment Task",
    learnerName: "Jean-Pierre Habimana",
    dueDate: null,
    severity: "medium",
  },
  {
    id: "u3",
    type: "overdue_task",
    title: "Medication Administration Log",
    learnerName: "Fatima Diallo",
    dueDate: "2026-02-22",
    severity: "high",
  },
];

const MOCK_LEARNERS: LearnerCard[] = [
  {
    id: "l1",
    name: "Amina Yusuf",
    progressPercent: 82,
    lastActiveAt: "2026-02-24T08:30:00Z",
    program: "Primary Care Training",
  },
  {
    id: "l2",
    name: "Jean-Pierre Habimana",
    progressPercent: 45,
    lastActiveAt: "2026-02-23T14:15:00Z",
    program: "Primary Care Training",
  },
  {
    id: "l3",
    name: "Fatima Diallo",
    progressPercent: 71,
    lastActiveAt: "2026-02-24T09:00:00Z",
    program: "Community Health",
  },
  {
    id: "l4",
    name: "Samuel Okonkwo",
    progressPercent: 93,
    lastActiveAt: "2026-02-24T07:45:00Z",
    program: "Primary Care Training",
  },
  {
    id: "l5",
    name: "Grace Mutoni",
    progressPercent: 38,
    lastActiveAt: "2026-02-21T11:00:00Z",
    program: "Community Health",
  },
  {
    id: "l6",
    name: "Ibrahim Keita",
    progressPercent: 56,
    lastActiveAt: "2026-02-24T10:20:00Z",
    program: "Emergency Response",
  },
];

const MOCK_SUBMISSIONS: SubmissionItem[] = [
  {
    id: "s1",
    learnerName: "Amina Yusuf",
    taskTitle: "Blood Pressure Measurement",
    submittedAt: "2026-02-24T09:15:00Z",
    evidenceCount: 2,
  },
  {
    id: "s2",
    learnerName: "Samuel Okonkwo",
    taskTitle: "Patient History Taking",
    submittedAt: "2026-02-24T08:30:00Z",
    evidenceCount: 1,
  },
  {
    id: "s3",
    learnerName: "Ibrahim Keita",
    taskTitle: "Sterile Technique Practice",
    submittedAt: "2026-02-23T16:45:00Z",
    evidenceCount: 3,
  },
];

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

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className={cn("mt-1 text-3xl font-bold", accent)}>{value}</p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              accent.includes("accent")
                ? "bg-accent-50"
                : accent.includes("amber")
                  ? "bg-amber-50"
                  : accent.includes("brand")
                    ? "bg-brand-50"
                    : "bg-purple-50"
            )}
          >
            <Icon className={cn("h-5 w-5", accent)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SupervisorDashboard() {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>(MOCK_URGENT);
  const [learners, setLearners] = useState<LearnerCard[]>(MOCK_LEARNERS);
  const [submissions, setSubmissions] =
    useState<SubmissionItem[]>(MOCK_SUBMISSIONS);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, these would be actual API calls:
      // const res = await fetch("/api/v1/supervisor/dashboard");
      // const json = await res.json();
      // setStats(json.data.stats);
      // setUrgentItems(json.data.urgent);
      // setLearners(json.data.learners);
      // setSubmissions(json.data.submissions);

      // Simulated delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      setStats(MOCK_STATS);
      setUrgentItems(MOCK_URGENT);
      setLearners(MOCK_LEARNERS);
      setSubmissions(MOCK_SUBMISSIONS);
    } catch {
      // Error handling would go here
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supervisor Dashboard
          </h1>
          <p className="text-gray-500">
            Monitor your team&#39;s progress and review submissions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboard}
          disabled={isLoading}
          aria-label="Refresh dashboard data"
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        role="region"
        aria-label="Dashboard statistics"
      >
        <StatCard
          label="Active Learners"
          value={stats.activeLearners}
          icon={Users}
          accent="text-accent-600"
        />
        <StatCard
          label="Pending Verifications"
          value={stats.pendingVerifications}
          icon={ShieldCheck}
          accent="text-amber-600"
        />
        <StatCard
          label="Tasks Due Today"
          value={stats.tasksDueToday}
          icon={CalendarCheck}
          accent="text-brand-600"
        />
        <StatCard
          label="Average Completion"
          value={`${stats.averageCompletion}%`}
          icon={TrendingUp}
          accent="text-purple-600"
        />
      </div>

      {/* Urgent section */}
      {urgentItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Urgent Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3" role="list" aria-label="Urgent items">
              {urgentItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        item.severity === "high"
                          ? "bg-red-100"
                          : "bg-amber-100"
                      )}
                    >
                      {item.type === "overdue_task" ? (
                        <Clock
                          className={cn(
                            "h-4 w-4",
                            item.severity === "high"
                              ? "text-red-600"
                              : "text-amber-600"
                          )}
                        />
                      ) : (
                        <AlertTriangle
                          className={cn(
                            "h-4 w-4",
                            item.severity === "high"
                              ? "text-red-600"
                              : "text-amber-600"
                          )}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.learnerName}
                        {item.dueDate && (
                          <span>
                            {" "}
                            &middot; Due{" "}
                            {new Date(item.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.type === "overdue_task" ? "destructive" : "secondary"
                    }
                  >
                    {item.type === "overdue_task" ? "Overdue" : "Failed"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout: Learners + Submissions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Learners */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">My Learners</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/supervisor/learners">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <div
              className="max-h-[400px] space-y-3 overflow-y-auto pr-1"
              role="list"
              aria-label="Learner cards"
            >
              {learners.map((learner) => (
                <a
                  key={learner.id}
                  href={`/supervisor/learners?id=${learner.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition-colors hover:border-accent-200 hover:bg-accent-50/30"
                  role="listitem"
                >
                  <Avatar className="h-9 w-9">
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
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {learner.name}
                      </p>
                      <span className="ml-2 text-xs text-gray-400">
                        {formatRelativeTime(learner.lastActiveAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{learner.program}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress
                        value={learner.progressPercent}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs font-medium text-gray-600">
                        {learner.progressPercent}%
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <a href="/supervisor/tasks">
                Review All
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <div
              className="space-y-3"
              role="list"
              aria-label="Recent task submissions"
            >
              {submissions.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">
                  No pending submissions to review.
                </p>
              )}
              {submissions.map((sub) => (
                <a
                  key={sub.id}
                  href={`/supervisor/tasks?submission=${sub.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition-colors hover:border-accent-200 hover:bg-accent-50/30"
                  role="listitem"
                >
                  <Avatar className="h-9 w-9">
                    {sub.learnerAvatarUrl && (
                      <AvatarImage
                        src={sub.learnerAvatarUrl}
                        alt={sub.learnerName}
                      />
                    )}
                    <AvatarFallback className="bg-brand-100 text-xs text-brand-700">
                      {getInitials(sub.learnerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {sub.taskTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sub.learnerName} &middot;{" "}
                      {formatRelativeTime(sub.submittedAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {sub.evidenceCount} file{sub.evidenceCount !== 1 ? "s" : ""}
                  </Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule Visit
            </Button>
            <Button variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Send Reminder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
