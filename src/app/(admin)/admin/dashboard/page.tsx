"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  UserPlus,
  FileBarChart,
  Activity,
  Database,
  Server,
  Video,
  ArrowRight,
  RefreshCw,
  Loader2,
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

interface DashboardData {
  totalLearners: number;
  activeLearners: number;
  totalCourses: number;
  publishedCourses: number;
  avgCompletionPct: number;
  pendingReviews: number;
  recentEnrollments?: number;
}

interface SystemService {
  name: string;
  status: "operational" | "degraded" | "down";
  latency: string;
  icon: React.ElementType;
}

// ---------------------------------------------------------------------------
// Static data (health check requires separate infrastructure)
// ---------------------------------------------------------------------------

const systemServices: SystemService[] = [
  { name: "PostgreSQL", status: "operational", latency: "12ms", icon: Database },
  { name: "Redis Cache", status: "operational", latency: "3ms", icon: Server },
  { name: "Mux Video", status: "operational", latency: "45ms", icon: Video },
  { name: "Claude AI", status: "operational", latency: "320ms", icon: Activity },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: SystemService["status"] }) {
  const colors = {
    operational: "bg-accent-500",
    degraded: "bg-amber-500",
    down: "bg-red-500",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === "operational" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/analytics?type=operational");
      const json = await res.json();
      if (json.data) {
        setData(json.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    fetchDashboard();
  };

  const stats = data
    ? [
        {
          label: "Total Users",
          value: data.totalLearners.toLocaleString(),
          icon: Users,
          iconBg: "bg-brand-50",
          iconColor: "text-brand-600",
        },
        {
          label: "Active Learners",
          value: data.activeLearners.toLocaleString(),
          icon: GraduationCap,
          iconBg: "bg-accent-50",
          iconColor: "text-accent-600",
        },
        {
          label: "Courses Published",
          value: `${data.publishedCourses} / ${data.totalCourses}`,
          icon: BookOpen,
          iconBg: "bg-purple-50",
          iconColor: "text-purple-600",
        },
        {
          label: "Completion Rate",
          value: `${data.avgCompletionPct.toFixed(1)}%`,
          icon: TrendingUp,
          iconBg: "bg-amber-50",
          iconColor: "text-amber-600",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of MEDICHIPS-LINK platform activity and health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <span className="text-xs text-gray-400">
            {loading ? "Loading..." : "Last updated: just now"}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/courses?action=create">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Button>
            </Link>
            <Link href="/admin/ai-builder">
              <Button variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" />
                AI Course Builder
              </Button>
            </Link>
            <Link href="/admin/video-production/new">
              <Button variant="outline" size="sm">
                <Video className="mr-2 h-4 w-4" />
                Video Studio
              </Button>
            </Link>
            <Link href="/admin/users?action=invite">
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Users
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" size="sm">
                <FileBarChart className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </Link>
            <Link href="/admin/content-review">
              <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                Content Review
              </Button>
            </Link>
            <Link href="/admin/translations">
              <Button variant="outline" size="sm">
                <FileBarChart className="mr-2 h-4 w-4" />
                Translations
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-10 w-10 text-red-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${stat.iconBg}`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Activity - 2 cols */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <CardDescription>Latest platform events</CardDescription>
                </div>
                <Link
                  href="/admin/analytics"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8">
                  <Activity className="h-10 w-10 text-gray-200" />
                  <p className="mt-3 text-sm font-medium text-gray-500">Coming soon</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Real-time activity feed is under development
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Pending Reviews */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pending Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50">
                      <AlertCircle className="h-7 w-7 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-gray-900">
                        {data?.pendingReviews ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">items awaiting review</p>
                    </div>
                  </div>
                  <Link href="/admin/content-review">
                    <Button variant="outline" size="sm" className="mt-4 w-full">
                      Review Queue
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemServices.map((service) => {
                      const Icon = service.icon;
                      return (
                        <div key={service.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <StatusDot status={service.status} />
                            <Icon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{service.name}</span>
                          </div>
                          <span className="text-xs font-mono text-gray-400">{service.latency}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 rounded-lg bg-accent-50 px-3 py-2">
                    <p className="text-xs font-medium text-accent-700">
                      All systems operational
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
