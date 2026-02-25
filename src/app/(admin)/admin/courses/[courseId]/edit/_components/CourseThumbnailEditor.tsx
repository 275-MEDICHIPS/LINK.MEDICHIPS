"use client";

import { useState, useRef, useCallback } from "react";
import {
  ImageIcon,
  Upload,
  Sparkles,
  Loader2,
  X,
  Grid3X3,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfHeaders } from "@/lib/utils/csrf";

// Medical education themed stock gallery
const GALLERY_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=450&fit=crop&q=80",
    label: "Medical Team",
  },
  {
    url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=450&fit=crop&q=80",
    label: "Lab Research",
  },
  {
    url: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&h=450&fit=crop&q=80",
    label: "Surgery",
  },
  {
    url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=450&fit=crop&q=80",
    label: "Emergency Care",
  },
  {
    url: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=450&fit=crop&q=80",
    label: "Medical Education",
  },
  {
    url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&h=450&fit=crop&q=80",
    label: "Healthcare",
  },
  {
    url: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=450&fit=crop&q=80",
    label: "Medical Diagnosis",
  },
  {
    url: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=800&h=450&fit=crop&q=80",
    label: "Patient Care",
  },
  {
    url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&h=450&fit=crop&q=80",
    label: "Clinical Practice",
  },
  {
    url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=450&fit=crop&q=80",
    label: "Anatomy Study",
  },
  {
    url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=450&fit=crop&q=80",
    label: "Pharmacy",
  },
  {
    url: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=450&fit=crop&q=80",
    label: "Consultation",
  },
];

// Gradient presets based on medical specialties
const GRADIENT_PRESETS = [
  { from: "#0ea5e9", to: "#6366f1", label: "Clinical Blue" },
  { from: "#10b981", to: "#0d9488", label: "Health Green" },
  { from: "#f59e0b", to: "#ef4444", label: "Emergency Red" },
  { from: "#8b5cf6", to: "#ec4899", label: "Research Purple" },
  { from: "#06b6d4", to: "#3b82f6", label: "Diagnostic Teal" },
  { from: "#f97316", to: "#eab308", label: "Vitality Orange" },
];

interface Props {
  courseId: string;
  courseTitle: string;
  thumbnailUrl: string | null;
  onThumbnailChange: (url: string | null) => void;
}

export default function CourseThumbnailEditor({
  courseId,
  courseTitle,
  thumbnailUrl,
  onThumbnailChange,
}: Props) {
  const [mode, setMode] = useState<"view" | "gallery" | "generate">("view");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get initials for gradient placeholder
  const initials = courseTitle
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

  // Pick a consistent gradient based on title
  const gradientIndex =
    courseTitle.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    GRADIENT_PRESETS.length;
  const gradient = GRADIENT_PRESETS[gradientIndex];

  const saveThumbnail = useCallback(
    async (url: string | null) => {
      setSaving(true);
      try {
        await fetch(`/api/v1/courses/${courseId}`, {
          method: "PATCH",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ thumbnailUrl: url }),
        });
        onThumbnailChange(url);
      } catch {
        // Handle error
      } finally {
        setSaving(false);
      }
    },
    [courseId, onThumbnailChange]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Get signed upload URL
      const urlRes = await fetch("/api/v1/media/upload-url", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          type: "image",
          fileName: file.name,
          contentType: file.type,
        }),
      });
      const urlData = await urlRes.json();

      if (!urlData.data?.uploadUrl) throw new Error("Failed to get upload URL");

      // Upload to GCS
      await fetch(urlData.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // Save the public URL
      if (urlData.data.publicUrl) {
        await saveThumbnail(urlData.data.publicUrl);
      }
    } catch {
      // Handle error
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGallerySelect = async (url: string) => {
    await saveThumbnail(url);
    setMode("view");
  };

  const handleGenerateGradient = async (preset: typeof GRADIENT_PRESETS[0]) => {
    // Create gradient thumbnail using canvas
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 450);
    grad.addColorStop(0, preset.from);
    grad.addColorStop(1, preset.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 450);

    // Draw subtle pattern overlay
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * 800,
        Math.random() * 450,
        50 + Math.random() * 100,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw title text
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Word wrap
    const words = courseTitle.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > 600) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 44;
    const startY = 225 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, 400, startY + i * lineHeight);
    });

    // Convert to blob and upload
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        setUploading(true);
        try {
          const urlRes = await fetch("/api/v1/media/upload-url", {
            method: "POST",
            headers: csrfHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              type: "image",
              fileName: `course-${courseId}-thumbnail.png`,
              contentType: "image/png",
            }),
          });
          const urlData = await urlRes.json();

          if (urlData.data?.uploadUrl) {
            await fetch(urlData.data.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/png" },
              body: blob,
            });

            if (urlData.data.publicUrl) {
              await saveThumbnail(urlData.data.publicUrl);
            }
          }
        } catch {
          // Handle error
        } finally {
          setUploading(false);
          setMode("view");
        }
      },
      "image/png",
      0.9
    );
  };

  const handleRemove = async () => {
    await saveThumbnail(null);
  };

  // Gallery view
  if (mode === "gallery") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Select from Gallery
          </p>
          <button
            onClick={() => setMode("view")}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GALLERY_IMAGES.map((img, i) => (
            <button
              key={i}
              onClick={() => handleGallerySelect(img.url)}
              disabled={saving}
              className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <img
                src={img.url}
                alt={img.label}
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                <span className="px-2 py-1 text-xs font-medium text-white">
                  {img.label}
                </span>
              </div>
              {thumbnailUrl === img.url && (
                <div className="absolute right-1 top-1 rounded-full bg-brand-500 p-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Generate view
  if (mode === "generate") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Generate Thumbnail
          </p>
          <button
            onClick={() => setMode("view")}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Select a color theme to generate a thumbnail with your course title
        </p>
        <div className="grid grid-cols-2 gap-2">
          {GRADIENT_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handleGenerateGradient(preset)}
              disabled={uploading}
              className="group relative overflow-hidden rounded-lg border border-gray-200 hover:border-brand-400"
            >
              <div
                className="flex aspect-video items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                }}
              >
                <span className="px-3 text-center text-xs font-bold text-white/90">
                  {courseTitle || "Course Title"}
                </span>
              </div>
              <div className="bg-white px-2 py-1.5">
                <span className="text-xs text-gray-600">{preset.label}</span>
              </div>
            </button>
          ))}
        </div>
        {uploading && (
          <div className="flex items-center justify-center gap-2 text-sm text-brand-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </div>
        )}
      </div>
    );
  }

  // Default view
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Course Thumbnail
      </p>

      {/* Preview */}
      <div className="relative overflow-hidden rounded-lg border border-gray-200">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Course thumbnail"
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div
            className="flex aspect-video items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            }}
          >
            <span className="text-3xl font-bold text-white/80">{initials || "?"}</span>
          </div>
        )}

        {/* Remove button */}
        {thumbnailUrl && (
          <button
            onClick={handleRemove}
            disabled={saving}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
            title="Remove thumbnail"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {(uploading || saving) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3 w-3" />
          Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={() => setMode("gallery")}
        >
          <Grid3X3 className="h-3 w-3" />
          Gallery
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={() => setMode("generate")}
        >
          <Sparkles className="h-3 w-3" />
          Generate
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
