"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  FileVideo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { csrfHeaders } from "@/lib/utils/csrf";

// ─── Types ──────────────────────────────────────────────────────────

interface SceneVideoUploaderProps {
  sceneId: string;
  jobId: string;
  uploadedVideoUrl: string | null;
  onUploadComplete: (sceneId: string, url: string, gcsPath: string) => void;
}

type UploadState = "idle" | "requesting" | "uploading" | "confirming" | "done" | "error";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

// ─── Component ──────────────────────────────────────────────────────

export default function SceneVideoUploader({
  sceneId,
  jobId,
  uploadedVideoUrl,
  onUploadComplete,
}: SceneVideoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>(
    uploadedVideoUrl ? "done" : "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(
    uploadedVideoUrl ? extractFileName(uploadedVideoUrl) : null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────

  function extractFileName(url: string): string {
    try {
      const path = new URL(url).pathname;
      return decodeURIComponent(path.split("/").pop() || "video");
    } catch {
      return "video";
    }
  }

  function validateFile(file: File): string | null {
    if (!file.type.startsWith("video/")) {
      return "Please select a video file.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size exceeds 500 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    }
    return null;
  }

  // ─── Upload flow ────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setUploadState("error");
        return;
      }

      setError(null);
      setFileName(file.name);
      setProgress(0);

      const apiBase = `/api/v1/admin/video-production/jobs/${jobId}/scenes/${sceneId}/upload`;

      try {
        // Step 1: Request signed URL
        setUploadState("requesting");

        const signedUrlRes = await fetch(apiBase, {
          method: "POST",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            requestSignedUrl: true,
            fileName: file.name,
            contentType: file.type,
          }),
        });

        const signedUrlJson = await signedUrlRes.json();
        if (!signedUrlRes.ok) {
          throw new Error(
            signedUrlJson.error?.message || "Failed to get upload URL"
          );
        }

        const { signedUrl, gcsPath } = signedUrlJson.data;

        // Step 2: Upload directly to GCS with progress tracking
        setUploadState("uploading");

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          abortRef.current = { abort: () => xhr.abort() } as AbortController;

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(
                new Error(`GCS upload failed with status ${xhr.status}`)
              );
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        });

        // Step 3: Confirm upload with the server
        setUploadState("confirming");

        const publicUrl = `https://storage.googleapis.com/${gcsPath}`;

        const confirmRes = await fetch(apiBase, {
          method: "POST",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            uploadedVideoUrl: publicUrl,
            uploadedVideoGcsPath: gcsPath,
          }),
        });

        const confirmJson = await confirmRes.json();
        if (!confirmRes.ok) {
          throw new Error(
            confirmJson.error?.message || "Failed to confirm upload"
          );
        }

        setUploadState("done");
        setProgress(100);
        onUploadComplete(sceneId, publicUrl, gcsPath);
      } catch (err) {
        if (err instanceof Error && err.message === "Upload cancelled") {
          setUploadState("idle");
          setFileName(null);
        } else {
          setError(
            err instanceof Error ? err.message : "Upload failed. Please try again."
          );
          setUploadState("error");
        }
      } finally {
        abortRef.current = null;
      }
    },
    [jobId, sceneId, onUploadComplete]
  );

  // ─── Drag & drop handlers ──────────────────────────────────────

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleReplace() {
    setUploadState("idle");
    setFileName(null);
    setProgress(0);
    setError(null);
    fileInputRef.current?.click();
  }

  function handleCancel() {
    abortRef.current?.abort();
    setUploadState("idle");
    setFileName(null);
    setProgress(0);
    setError(null);
  }

  // ─── Render: Completed state ──────────────────────────────────

  if (uploadState === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-green-800">
            {fileName || "Video uploaded"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-green-700 hover:text-green-900"
          onClick={handleReplace}
        >
          Replace
        </Button>
      </div>
    );
  }

  // ─── Render: Uploading state ──────────────────────────────────

  if (
    uploadState === "requesting" ||
    uploadState === "uploading" ||
    uploadState === "confirming"
  ) {
    const statusLabel =
      uploadState === "requesting"
        ? "Preparing upload..."
        : uploadState === "uploading"
          ? `Uploading ${progress}%`
          : "Confirming...";

    return (
      <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-blue-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="font-medium">{statusLabel}</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded p-0.5 text-blue-400 transition-colors hover:text-blue-600"
            aria-label="Cancel upload"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {uploadState === "uploading" && (
          <Progress value={progress} className="h-1.5" />
        )}
        {fileName && (
          <p className="truncate text-[11px] text-blue-500">{fileName}</p>
        )}
      </div>
    );
  }

  // ─── Render: Error state ──────────────────────────────────────

  if (uploadState === "error") {
    return (
      <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 px-3 py-3">
        <div className="flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            setUploadState("idle");
            setError(null);
            setFileName(null);
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // ─── Render: Idle / drop zone ─────────────────────────────────

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors ${
        isDragOver
          ? "border-brand-400 bg-brand-50/50"
          : "border-gray-300 bg-gray-50/30 hover:border-gray-400 hover:bg-gray-50"
      }`}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload video file"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
    >
      <FileVideo
        className={`h-6 w-6 ${
          isDragOver ? "text-brand-500" : "text-gray-400"
        }`}
      />
      <p className="text-xs text-gray-600">
        {isDragOver ? (
          <span className="font-medium text-brand-600">Drop video here</span>
        ) : (
          <>
            <span className="font-medium text-brand-600">Click to upload</span>
            {" "}or drag & drop
          </>
        )}
      </p>
      <p className="text-[10px] text-gray-400">Video files up to 500 MB</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
