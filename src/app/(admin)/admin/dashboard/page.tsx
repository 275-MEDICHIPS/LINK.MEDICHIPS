"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  UserPlus,
  FileBarChart,
  Activity,
  Database,
  Server,
  Video,
  ArrowRight,
  RefreshCw,
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

interface StatCard {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

interface ActivityItem {
  id: string;
  type: "registration" | "completion" | "submission" | "review";
  title: string;
  description: string;
  time: string;
}

interface SystemService {
  name: string;
  status: "operational" | "degraded" | "down";
  latency: string;
  icon: React.ElementType;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const stats: StatCard[] = [
  {
    label: "Total Users",
    value: "2,847",
    change: "+12% from last month",
    changeType: "positive",
    icon: Users,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    label: "Active Learners",
    value: "1,423",
    change: "+8% from last month",
    changeType: "positive",
    icon: GraduationCap,
    iconBg: "bg-accent-50",
    iconColor: "text-accent-600",
  },
  {
    label: "Courses Published",
    value: "34",
    change: "+3 this month",
    changeType: "positive",
    icon: BookOpen,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    label: "Completion Rate",
    value: "78.4%",
    change: "+2.1% from last month",
    changeType: "positive",
    icon: TrendingUp,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
];

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    type: "registration",
    title: "New user registered",
    description: "Dr. Amina Osei joined via KOICA Ethiopia program",
    time: "5 minutes ago",
  },
  {
    id: "2",
    type: "completion",
    title: "Course completed",
    description: 'Jean-Pierre M. completed "Emergency Triage Protocol"',
    time: "12 minutes ago",
  },
  {
    id: "3",
    type: "submission",
    title: "Content submitted for review",
    description: '"Pediatric Assessment L2" submitted by Dr. Kim',
    time: "34 minutes ago",
  },
  {
    id: "4",
    type: "registration",
    title: "Bulk registration",
    description: "15 nurses added from Muhimbili Hospital, Tanzania",
    time: "1 hour ago",
  },
  {
    id: "5",
    type: "completion",
    title: "Module completed",
    description: 'Sarah K. completed Module 3 of "Wound Care Basics"',
    time: "2 hours ago",
  },
  {
    id: "6",
    type: "review",
    title: "Content approved",
    description: '"Infection Control" course approved by medical reviewer',
    time: "3 hours ago",
  },
];

const systemServices: SystemService[] = [
  { name: "PostgreSQL", status: "operational", latency: "12ms", icon: Database },
  { name: "Redis Cache", status: "operational", latency: "3ms", icon: Server },
  { name: "Mux Video", status: "operational", latency: "45ms", icon: Video },
  { name: "Claude AI", status: "operational", latency: "320ms", icon: Activity },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCardComponent({ stat }: { stat: StatCard }) {
  const Icon = stat.icon;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            <p
              className={`mt-1 text-xs font-medium ${
                stat.changeType === "positive"
                  ? "text-accent-600"
                  : stat.changeType === "negative"
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {stat.change}
            </p>
          </div>
          <div className={`rounded-xl p-3 ${stat.iconBg}`}>
            <Icon className={`h-5 w-5 ${stat.iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  switch (type) {
    case "registration":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
          <UserPlus className="h-4 w-4 text-brand-600" />
        </div>
      );
    case "completion":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-50">
          <CheckCircle2 className="h-4 w-4 text-accent-600" />
        </div>
      );
    case "submission":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
          <FileBarChart className="h-4 w-4 text-amber-600" />
        </div>
      );
    case "review":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50">
          <CheckCircle2 className="h-4 w-4 text-purple-600" />
        </div>
      );
  }
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

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
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <span className="text-xs text-gray-400">Last updated: just now</span>
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
                Review Content
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCardComponent key={stat.label} stat={stat} />
        ))}
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
            <div className="space-y-1">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                >
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="truncate text-xs text-gray-500">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{item.time}</span>
                </div>
              ))}
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
                  <p className="text-3xl font-bold text-gray-900">7</p>
                  <p className="text-xs text-gray-500">courses awaiting review</p>
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

    </div>
  );
}
