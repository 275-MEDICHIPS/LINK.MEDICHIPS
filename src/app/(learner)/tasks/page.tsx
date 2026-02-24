"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  Camera,
  Upload,
  FileImage,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { csrfHeaders } from "@/lib/utils/csrf";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface TaskEvidence {
  id: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  riskLevel: "L1" | "L2" | "L3" | null;
  checklist: ChecklistItem[] | null;
  dueDate: string | null;
  completedAt: string | null;
  evidence: TaskEvidence[];
  lessonTitle: string | null;
  courseTitle: string | null;
  source: "AUTO_GENERATED" | "SUPERVISOR_ASSIGNED" | "SELF_CREATED";
  createdAt: string;
}

interface TasksResponse {
  tasks: TaskItem[];
  total: number;
  page: number;
  pageSize: number;
}

type TranslationFn = ReturnType<typeof useTranslations>;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading tasks">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="space-y-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: TranslationFn }) {
  const config: Record<string, { labelKey: string; className: string }> = {
    PENDING: {
      labelKey: "pending",
      className: "bg-gray-100 text-gray-600",
    },
    IN_PROGRESS: {
      labelKey: "inProgress",
      className: "bg-blue-100 text-blue-700",
    },
    SUBMITTED: {
      labelKey: "submitted",
      className: "bg-purple-100 text-purple-700",
    },
    VERIFIED: {
      labelKey: "verified",
      className: "bg-accent-100 text-accent-700",
    },
    REJECTED: {
      labelKey: "rejected",
      className: "bg-red-100 text-red-700",
    },
  };

  const s = config[status] ?? config.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        s.className
      )}
    >
      {t(s.labelKey)}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onUploadEvidence,
  t,
}: {
  task: TaskItem;
  onUploadEvidence: (taskId: string) => void;
  t: TranslationFn;
}) {
  const [expanded, setExpanded] = useState(false);

  const checklistDone = task.checklist?.filter((item) => item.done).length ?? 0;
  const checklistTotal = task.checklist?.length ?? 0;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "VERIFIED";

  const canUpload = ["PENDING", "IN_PROGRESS", "REJECTED"].includes(
    task.status
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow",
        isOverdue ? "border-red-200" : "border-gray-100",
        expanded && "shadow-md"
      )}
    >
      {/* Task Header - Tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
        aria-expanded={expanded}
        aria-controls={`task-${task.id}-details`}
      >
        {/* Status Icon */}
        <div className="mt-0.5 flex-shrink-0">
          {task.status === "VERIFIED" ? (
            <CheckCircle2
              className="h-5 w-5 text-accent-500"
              aria-hidden="true"
            />
          ) : task.status === "REJECTED" ? (
            <AlertCircle
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          ) : (
            <Circle className="h-5 w-5 text-gray-300" aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {task.title}
            </h3>
            {task.riskLevel && (
              <span
                className={cn(
                  "flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-bold",
                  task.riskLevel === "L1" && "bg-green-100 text-green-700",
                  task.riskLevel === "L2" && "bg-amber-100 text-amber-700",
                  task.riskLevel === "L3" && "bg-red-100 text-red-700"
                )}
              >
                {task.riskLevel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} t={t} />
            {task.dueDate && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isOverdue ? "font-semibold text-red-600" : "text-gray-400"
                )}
              >
                <CalendarDays className="h-2.5 w-2.5" aria-hidden="true" />
                {isOverdue
                  ? t("overdue", {
                      date: new Date(task.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }),
                    })
                  : new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
              </span>
            )}
            {task.evidence.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <FileImage className="h-2.5 w-2.5" aria-hidden="true" />
                {t("files", { count: task.evidence.length })}
              </span>
            )}
          </div>

          {/* Checklist Progress */}
          {checklistTotal > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    checklistPct >= 100 ? "bg-accent-500" : "bg-brand-500"
                  )}
                  style={{ width: `${checklistPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-400">
                {checklistDone}/{checklistTotal}
              </span>
            </div>
          )}
        </div>

        {/* Expand Icon */}
        {expanded ? (
          <ChevronUp
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div
          id={`task-${task.id}-details`}
          className="space-y-3 border-t border-gray-50 px-4 pb-4 pt-3"
        >
          {/* Description */}
          {task.description && (
            <p className="text-sm leading-relaxed text-gray-600">
              {task.description}
            </p>
          )}

          {/* Course/Lesson reference */}
          {task.courseTitle && (
            <p className="text-[10px] text-gray-400">
              {t("from", {
                source: task.courseTitle + (task.lessonTitle ? ` - ${task.lessonTitle}` : ""),
              })}
            </p>
          )}

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">{t("checklist")}</p>
              <ul className="space-y-1" role="list">
                {task.checklist.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm"
                    role="listitem"
                  >
                    {item.done ? (
                      <CheckCircle2
                        className="h-4 w-4 flex-shrink-0 text-accent-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="h-4 w-4 flex-shrink-0 text-gray-300"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        item.done
                          ? "text-gray-400 line-through"
                          : "text-gray-700"
                      )}
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence */}
          {task.evidence.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">{t("evidence")}</p>
              <div className="flex flex-wrap gap-2">
                {task.evidence.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label={`View evidence file uploaded ${new Date(ev.createdAt).toLocaleDateString()}`}
                  >
                    {ev.fileType.startsWith("image") ? (
                      <img
                        src={ev.fileUrl}
                        alt="Evidence"
                        className="h-full w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <FileImage
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Upload Evidence */}
          {canUpload && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadEvidence(task.id)}
                className="flex-1"
              >
                <Camera className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {t("takePhoto")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUploadEvidence(task.id)}
                className="flex-1"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {t("uploadFile")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab, t }: { tab: TabStatus; t: TranslationFn }) {
  const messages: Record<TabStatus, { titleKey: string; descKey: string }> = {
    PENDING: {
      titleKey: "noPendingTasks",
      descKey: "noPendingTasksDesc",
    },
    IN_PROGRESS: {
      titleKey: "noInProgressTasks",
      descKey: "noInProgressTasksDesc",
    },
    COMPLETED: {
      titleKey: "noCompletedTasks",
      descKey: "noCompletedTasksDesc",
    },
  };

  const msg = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
        <ClipboardCheck className="h-6 w-6 text-gray-300" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900">{t(msg.titleKey)}</p>
        <p className="mt-1 text-xs text-gray-500">{t(msg.descKey)}</p>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function TasksPage() {
  const t = useTranslations("task");
  const tc = useTranslations("common");

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabStatus>("PENDING");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const TABS: { label: string; value: TabStatus; statuses: string[] }[] = [
    {
      label: t("pending"),
      value: "PENDING",
      statuses: ["PENDING", "REJECTED"],
    },
    {
      label: t("inProgress"),
      value: "IN_PROGRESS",
      statuses: ["IN_PROGRESS", "SUBMITTED"],
    },
    {
      label: t("completed"),
      value: "COMPLETED",
      statuses: ["VERIFIED"],
    },
  ];

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/learner/tasks");
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load tasks (${res.status})`);
      const json: { data: TasksResponse } = await res.json();
      setTasks(json.data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const activeStatuses = TABS.find((tab) => tab.value === activeTab)?.statuses ?? [];
  const filteredTasks = tasks.filter((task) => activeStatuses.includes(task.status));

  const tabCounts: Record<TabStatus, number> = {
    PENDING: tasks.filter((task) =>
      TABS[0].statuses.includes(task.status)
    ).length,
    IN_PROGRESS: tasks.filter((task) =>
      TABS[1].statuses.includes(task.status)
    ).length,
    COMPLETED: tasks.filter((task) =>
      TABS[2].statuses.includes(task.status)
    ).length,
  };

  const handleUploadEvidence = (taskId: string) => {
    setUploadingTaskId(taskId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTaskId) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", uploadingTaskId);

      const res = await fetch(`/api/v1/learner/tasks/${uploadingTaskId}/evidence`, {
        method: "POST",
        headers: csrfHeaders(),
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      // Refresh tasks
      await fetchTasks();
    } catch {
      // Allow retry
    } finally {
      setUploadingTaskId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <h1 className="text-lg font-bold text-gray-900">{t("tasks")}</h1>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-xl bg-gray-100 p-1"
        role="tablist"
        aria-label="Task status filter"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors",
              activeTab === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
            {tabCounts[tab.value] > 0 && (
              <span
                className={cn(
                  "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold",
                  activeTab === tab.value
                    ? "bg-brand-500 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {tabCounts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Hidden file input for evidence upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Content */}
      {loading ? (
        <TasksSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            {tc("tryAgain")}
          </Button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState tab={activeTab} t={t} />
      ) : (
        <div className="space-y-3" role="list" aria-label={`${activeTab.replace("_", " ").toLowerCase()} tasks`}>
          {filteredTasks.map((task) => (
            <div key={task.id} role="listitem">
              <TaskCard
                task={task}
                onUploadEvidence={handleUploadEvidence}
                t={t}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
