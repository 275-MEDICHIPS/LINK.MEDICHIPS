"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  Play,
  RefreshCw,
  Send,
  Eye,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Film,
  FileText,
  DollarSign,
  RotateCcw,
  Ban,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SceneStoryboard from "../_components/SceneStoryboard";

// ─── Types ───────────────────────────────────────────────────────────

interface JobDetail {
  id: string;
  method: string;
  provider: string;
  status: string;
  scriptId?: string | null;
  script?: {
    id: string;
    title: string;
    rawScript: string;
    segments?: { speakerLabel: string; text: string; durationSec: number; visualNotes?: string }[];
    totalDurationSec?: number;
    status: string;
  } | null;
  sourceVideoUrl?: string | null;
  externalJobId?: string | null;
  outputVideoUrl?: string | null;
  muxPlaybackId?: string | null;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  estimatedCostUsd?: number | null;
  actualCostUsd?: number | null;
  errorMessage?: string | null;
  retryCount: number;
  maxRetries: number;
  submittedAt?: string | null;
  renderStartedAt?: string | null;
  renderCompletedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  statusHistory?: {
    id: string;
    fromStatus: string;
    toStatus: string;
    triggeredBy: string;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }[];
  topicInput?: string | null;
  finalMergedVideoUrl?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenes?: any[];
  courseId?: string | null;
  lessonId?: string | null;
  course?: { id: string; translations: { title: string }[] } | null;
  lesson?: {
    translations: { title: string; locale: string }[];
    module?: {
      translations: { title: string }[];
      course?: { id: string; translations: { title: string }[] };
    };
  } | null;
}

// ─── Pipeline Steps ─────────────────────────────────────────────────

const AI_PIPELINE_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "SCRIPT_GENERATING", label: "Script" },
  { key: "SCRIPT_REVIEW", label: "Review" },
  { key: "SCENE_SETUP", label: "Scenes" },
  { key: "SCENE_RENDERING", label: "Render" },
  { key: "MERGING", label: "Merge" },
  { key: "FINAL_REVIEW", label: "Final" },
  { key: "COMPLETED", label: "Complete" },
];

const FACE_SWAP_PIPELINE_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "QUEUED", label: "Queued" },
  { key: "FACE_SWAPPING", label: "Face Swap" },
  { key: "POST_PROCESSING", label: "Processing" },
  { key: "REVIEW", label: "Review" },
  { key: "COMPLETED", label: "Complete" },
];

function PipelineStepper({
  steps,
  currentStatus,
}: {
  steps: { key: string; label: string }[];
  currentStatus: string;
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  const isFailed = currentStatus === "FAILED";
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {steps.map((step, i) => {
        const isComplete = !isFailed && !isCancelled && i < currentIndex;
        const isCurrent = step.key === currentStatus;
        const isActive = isCurrent && !isFailed && !isCancelled;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  isComplete
                    ? "bg-accent-100 text-accent-700"
                    : isActive
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`mt-1 text-[10px] ${
                  isComplete || isActive
                    ? "font-medium text-gray-700"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-6 ${
                  isComplete ? "bg-accent-300" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
      {(isFailed || isCancelled) && (
        <div className="ml-2 flex flex-col items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              isFailed ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"
            }`}
          >
            {isFailed ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="mt-1 text-[10px] font-medium text-red-600">
            {isFailed ? "Failed" : "Cancelled"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishLessonId, setPublishLessonId] = useState("");

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/admin/video-production/jobs/${jobId}`);
      const json = await res.json();
      if (json.data) setJob(json.data);
    } catch {
      setError("Failed to load job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Auto-refresh for active jobs
  useEffect(() => {
    if (!job) return;
    const activeStatuses = [
      "SCRIPT_GENERATING",
      "QUEUED",
      "RENDERING",
      "FACE_SWAPPING",
      "POST_PROCESSING",
      "SCENE_RENDERING",
      "MERGING",
      "SCENE_UPLOADING",
    ];
    if (!activeStatuses.includes(job.status)) return;

    const interval = setInterval(fetchJob, 10_000);
    return () => clearInterval(interval);
  }, [job?.status, fetchJob]);

  async function doAction(
    action: string,
    method = "POST",
    body?: Record<string, unknown>
  ) {
    setActionLoading(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/video-production/jobs/${jobId}/${action}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body && { body: JSON.stringify(body) }),
        }
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error?.message || `Action ${action} failed`);
      await fetchJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center text-gray-500">Job not found</div>
    );
  }

  const pipelineSteps =
    job.method === "AI_GENERATED"
      ? AI_PIPELINE_STEPS
      : FACE_SWAP_PIPELINE_STEPS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/video-production">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {job.script?.title || "Video Job"}
            </h1>
            <p className="text-sm text-gray-500">
              {job.method.replace(/_/g, " ")} via{" "}
              {job.provider.replace(/_/g, " ")}
              {(job.courseId || job.course || job.lesson?.module?.course) && (
                <span className="ml-2">
                  &middot;{" "}
                  <Link
                    href={`/admin/courses/${
                      job.courseId ||
                      job.course?.id ||
                      job.lesson?.module?.course?.id
                    }/edit`}
                    className="text-brand-600 hover:underline"
                  >
                    {job.course?.translations?.[0]?.title ||
                      job.lesson?.module?.course?.translations?.[0]?.title ||
                      "View Course"}
                  </Link>
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJob}
          className="gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Pipeline Progress */}
      <Card>
        <CardContent className="p-4">
          <PipelineStepper steps={pipelineSteps} currentStatus={job.status} />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Video Preview + Script */}
        <div className="space-y-4 lg:col-span-2">
          {/* Video Preview */}
          {job.muxPlaybackId && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Video Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <video
                    src={`https://stream.mux.com/${job.muxPlaybackId}.m3u8`}
                    poster={job.thumbnailUrl || undefined}
                    controls
                    className="h-full w-full"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thumbnail preview if no video yet */}
          {!job.muxPlaybackId && job.thumbnailUrl && (
            <Card>
              <CardContent className="p-4">
                <img
                  src={job.thumbnailUrl}
                  alt="Thumbnail"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              </CardContent>
            </Card>
          )}

          {/* Script Panel */}
          {job.script && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Script
                  {job.script.totalDurationSec && (
                    <span className="text-xs font-normal text-gray-400">
                      ({Math.round(job.script.totalDurationSec / 60)} min)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {job.script.segments &&
                Array.isArray(job.script.segments) ? (
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {(
                      job.script.segments as {
                        speakerLabel: string;
                        text: string;
                        durationSec: number;
                        visualNotes?: string;
                      }[]
                    ).map((seg, i) => (
                      <div
                        key={i}
                        className="rounded border border-gray-100 p-2 text-sm"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-brand-600">
                            {seg.speakerLabel}
                          </span>
                          <span className="text-xs text-gray-400">
                            {seg.durationSec}s
                          </span>
                        </div>
                        <p className="text-gray-700">{seg.text}</p>
                        {seg.visualNotes && (
                          <p className="mt-1 text-xs italic text-gray-400">
                            {seg.visualNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
                    {job.script.rawScript}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
          {/* Scene View */}
          {job.method === "AI_GENERATED" && job.scenes && job.scenes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Film className="h-4 w-4" />
                  Scenes ({job.scenes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SceneStoryboard
                  scenes={job.scenes}
                  mode={
                    ["SCENE_SETUP", "SCENE_UPLOADING"].includes(job.status)
                      ? "setup"
                      : ["SCENE_RENDERING", "MERGING"].includes(job.status)
                        ? "rendering"
                        : "review"
                  }
                  jobId={job.id}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Status Card + Actions + History */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.status === "COMPLETED"
                      ? "bg-accent-50 text-accent-700"
                      : job.status === "FAILED"
                        ? "bg-red-50 text-red-700"
                        : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {job.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Provider</span>
                <span className="text-gray-900">
                  {job.provider.replace(/_/g, " ")}
                </span>
              </div>
              {job.externalJobId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">External ID</span>
                  <span className="max-w-32 truncate font-mono text-xs text-gray-600">
                    {job.externalJobId}
                  </span>
                </div>
              )}
              {job.durationSec && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-900">
                    {Math.round(job.durationSec / 60)} min
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Retries</span>
                <span className="text-gray-900">
                  {job.retryCount} / {job.maxRetries}
                </span>
              </div>
              {(job.estimatedCostUsd || job.actualCostUsd) && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-gray-500">
                    <DollarSign className="h-3 w-3" />
                    Cost
                  </span>
                  <span className="text-gray-900">
                    ${(job.actualCostUsd || job.estimatedCostUsd)?.toFixed(2)}
                    {!job.actualCostUsd && job.estimatedCostUsd && (
                      <span className="text-xs text-gray-400"> (est.)</span>
                    )}
                  </span>
                </div>
              )}
              {job.errorMessage && (
                <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {job.errorMessage}
                </div>
              )}
              <div className="border-t border-gray-100 pt-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Created</span>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
                {job.submittedAt && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Submitted</span>
                    <span>
                      {new Date(job.submittedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {job.completedAt && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Completed</span>
                    <span>
                      {new Date(job.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job.status === "SCRIPT_REVIEW" && (
                <Button
                  onClick={() => doAction("approve-script")}
                  disabled={actionLoading !== null}
                  className="w-full gap-2 bg-accent-500 hover:bg-accent-600"
                  size="sm"
                >
                  {actionLoading === "approve-script" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve Script
                </Button>
              )}

              {job.status === "QUEUED" && (
                <Button
                  onClick={() => doAction("submit")}
                  disabled={actionLoading !== null}
                  className="w-full gap-2 bg-brand-500 hover:bg-brand-600"
                  size="sm"
                >
                  {actionLoading === "submit" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit to Provider
                </Button>
              )}

              {job.status === "DRAFT" && job.method === "FACE_SWAP" && (
                <Button
                  onClick={() => doAction("submit")}
                  disabled={actionLoading !== null}
                  className="w-full gap-2 bg-brand-500 hover:bg-brand-600"
                  size="sm"
                >
                  {actionLoading === "submit" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Face Swap
                </Button>
              )}

              {(job.status === "REVIEW" || job.status === "FINAL_REVIEW") && (
                <>
                  <Button
                    onClick={() => doAction("approve")}
                    disabled={actionLoading !== null}
                    className="w-full gap-2 bg-accent-500 hover:bg-accent-600"
                    size="sm"
                  >
                    {actionLoading === "approve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve Video
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      doAction("reject", "POST", {
                        reason: "Needs revision",
                      })
                    }
                    disabled={actionLoading !== null}
                    className="w-full gap-2 text-red-600"
                    size="sm"
                  >
                    {actionLoading === "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Reject
                  </Button>
                </>
              )}

              {/* Re-render from FINAL_REVIEW */}
              {job.status === "FINAL_REVIEW" && job.method === "AI_GENERATED" && (
                <Button
                  onClick={() => doAction("start-rendering")}
                  disabled={actionLoading !== null}
                  variant="outline"
                  className="w-full gap-2"
                  size="sm"
                >
                  {actionLoading === "start-rendering" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Re-render Changed Scenes
                </Button>
              )}

              {/* Start Scene Rendering */}
              {job.status === "SCENE_SETUP" && job.method === "AI_GENERATED" && (
                <Button
                  onClick={() => doAction("start-rendering")}
                  disabled={actionLoading !== null}
                  className="w-full gap-2 bg-brand-500 hover:bg-brand-600"
                  size="sm"
                >
                  {actionLoading === "start-rendering" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start Scene Rendering
                </Button>
              )}

              {/* Check & Merge Scenes */}
              {job.status === "SCENE_RENDERING" && job.method === "AI_GENERATED" && (
                <Button
                  onClick={() => doAction("check-scenes")}
                  disabled={actionLoading !== null}
                  variant="outline"
                  className="w-full gap-2"
                  size="sm"
                >
                  {actionLoading === "check-scenes" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Check & Merge Scenes
                </Button>
              )}

              {job.status === "COMPLETED" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Lesson ID to publish to"
                    value={publishLessonId}
                    onChange={(e) => setPublishLessonId(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    onClick={() =>
                      doAction("publish", "POST", {
                        lessonId: publishLessonId,
                      })
                    }
                    disabled={
                      actionLoading !== null || !publishLessonId
                    }
                    className="w-full gap-2 bg-brand-500 hover:bg-brand-600"
                    size="sm"
                  >
                    {actionLoading === "publish" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Publish to Lesson
                  </Button>
                </div>
              )}

              {job.status === "FAILED" && (
                <Button
                  onClick={() => doAction("retry")}
                  disabled={actionLoading !== null}
                  variant="outline"
                  className="w-full gap-2"
                  size="sm"
                >
                  {actionLoading === "retry" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Retry Job
                </Button>
              )}

              {["DRAFT", "SCRIPT_REVIEW", "QUEUED", "SCENE_SETUP", "SCENE_UPLOADING"].includes(job.status) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Cancel this job?")) {
                      fetch(
                        `/api/v1/admin/video-production/jobs/${jobId}`,
                        { method: "DELETE" }
                      ).then(() => router.push("/admin/video-production"));
                    }
                  }}
                  className="w-full gap-2 text-gray-500"
                  size="sm"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Job
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Status History Timeline */}
          {job.statusHistory && job.statusHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {job.statusHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex gap-3 text-xs"
                    >
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-gray-300" />
                        <div className="w-px flex-1 bg-gray-200" />
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-gray-700">
                            {entry.fromStatus} → {entry.toStatus}
                          </span>
                        </div>
                        <div className="mt-0.5 text-gray-400">
                          by {entry.triggeredBy} ·{" "}
                          {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
