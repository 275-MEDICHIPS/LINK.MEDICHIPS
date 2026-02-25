"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Video,
  Play,
  ExternalLink,
  Loader2,
  Sparkles,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LatestJob {
  id: string;
  status: string;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
}

interface Props {
  courseId: string;
  lessonId: string;
  latestJob?: LatestJob;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "text-gray-500" },
  SCRIPT_GENERATING: { label: "Generating Script...", color: "text-brand-600" },
  SCRIPT_REVIEW: { label: "Script Review", color: "text-amber-600" },
  QUEUED: { label: "Queued", color: "text-blue-600" },
  RENDERING: { label: "Rendering...", color: "text-brand-600" },
  FACE_SWAPPING: { label: "Processing...", color: "text-brand-600" },
  POST_PROCESSING: { label: "Post-processing...", color: "text-brand-600" },
  REVIEW: { label: "Ready for Review", color: "text-amber-600" },
  COMPLETED: { label: "Completed", color: "text-accent-600" },
  FAILED: { label: "Failed", color: "text-red-600" },
  CANCELLED: { label: "Cancelled", color: "text-gray-500" },
};

export default function LessonVideoSection({
  courseId,
  lessonId,
  latestJob,
}: Props) {
  const [showUpload] = useState(false);

  const isGenerating = latestJob && [
    "DRAFT", "SCRIPT_GENERATING", "QUEUED", "RENDERING",
    "FACE_SWAPPING", "POST_PROCESSING",
  ].includes(latestJob.status);

  const isComplete = latestJob?.status === "COMPLETED";
  const isReview = latestJob && ["SCRIPT_REVIEW", "REVIEW"].includes(latestJob.status);

  // Completed video with Mux player
  if (isComplete && latestJob.muxPlaybackId) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Video
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="relative aspect-video bg-black">
            <img
              src={`https://image.mux.com/${latestJob.muxPlaybackId}/thumbnail.jpg?width=640`}
              alt="Video thumbnail"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <Play className="h-6 w-6 text-gray-900" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-accent-600">
                <span className="h-2 w-2 rounded-full bg-accent-500" />
                Completed
              </span>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/video-production/${latestJob.id}`}>
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  View in Studio
                </Button>
              </Link>
              <Link
                href={`/admin/video-production/new?courseId=${courseId}&lessonId=${lessonId}`}
              >
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  Re-generate
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    const statusInfo = STATUS_LABELS[latestJob.status] || {
      label: latestJob.status,
      color: "text-gray-500",
    };
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Video
        </p>
        <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-6">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className={`mt-3 text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Video is being generated. This may take a few minutes.
            </p>
            <Link href={`/admin/video-production/${latestJob.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                View in Studio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Review state
  if (isReview && latestJob) {
    const statusInfo = STATUS_LABELS[latestJob.status];
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Video
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-6">
          <div className="flex flex-col items-center text-center">
            <Video className="h-8 w-8 text-amber-500" />
            <p className={`mt-3 text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Video needs review before it can be published.
            </p>
            <Link href={`/admin/video-production/${latestJob.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Review in Studio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No video — show generation options
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Video
      </p>
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8">
        <div className="flex flex-col items-center text-center">
          <Video className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">
            No video yet
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Generate an AI video or upload a video file
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/admin/video-production/new?courseId=${courseId}&lessonId=${lessonId}`}
            >
              <Button
                size="sm"
                className="gap-1.5 bg-brand-500 hover:bg-brand-600"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate AI Video
              </Button>
            </Link>
            {!showUpload && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled>
                <Upload className="h-3.5 w-3.5" />
                Upload Video
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Failed state hint */}
      {latestJob?.status === "FAILED" && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          Previous generation failed.{" "}
          <Link
            href={`/admin/video-production/${latestJob.id}`}
            className="font-medium underline"
          >
            View details
          </Link>
        </div>
      )}
    </div>
  );
}
