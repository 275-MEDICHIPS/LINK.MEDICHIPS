"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Wand2,
  Video,
  Loader2,
  Sparkles,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ─── Types ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4;

interface JobConfig {
  method: "AI_GENERATED" | "FACE_SWAP" | null;
  provider: string;
  // AI Generated config
  avatarId: string;
  voiceId: string;
  language: string;
  targetDurationSec: number;
  aspectRatio: string;
  // Face Swap config
  sourceVideoUrl: string;
  targetFaceImageUrl: string;
  blurOriginalFaces: boolean;
  preserveExpressions: boolean;
  resolution: string;
  fidelityLevel: string;
  // Script
  topic: string;
  riskLevel: "L1" | "L2" | "L3";
  additionalInstructions: string;
  // Linking
  courseId: string;
  lessonId: string;
}

// ─── Step Indicator ─────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Method" },
  { num: 2, label: "Configure" },
  { num: 3, label: "Script" },
  { num: 4, label: "Review" },
];

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              step.num < current
                ? "bg-accent-100 text-accent-700"
                : step.num === current
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {step.num < current ? <Check className="h-4 w-4" /> : step.num}
          </div>
          <span
            className={`hidden text-sm sm:inline ${
              step.num === current
                ? "font-medium text-gray-900"
                : "text-gray-400"
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <ChevronRight className="h-4 w-4 text-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────────

export default function NewVideoJobWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<{
    title: string;
    segments: { speakerLabel: string; text: string; durationSec: number; visualNotes?: string }[];
    totalDurationSec: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<JobConfig>({
    method: null,
    provider: "",
    avatarId: "",
    voiceId: "",
    language: "en",
    targetDurationSec: 180,
    aspectRatio: "16:9",
    sourceVideoUrl: "",
    targetFaceImageUrl: "",
    blurOriginalFaces: true,
    preserveExpressions: true,
    resolution: "1080p",
    fidelityLevel: "high",
    topic: "",
    riskLevel: "L1",
    additionalInstructions: "",
    courseId: "",
    lessonId: "",
  });

  function update(key: keyof JobConfig, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return config.method !== null && config.provider !== "";
      case 2:
        if (config.method === "FACE_SWAP") {
          return config.sourceVideoUrl.length > 0;
        }
        return true;
      case 3:
        if (config.method === "AI_GENERATED") {
          return config.topic.length >= 5;
        }
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  async function handleGenerateScript() {
    setScriptGenerating(true);
    setError(null);
    try {
      // First create the job
      const jobRes = await fetch("/api/v1/admin/video-production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: config.method,
          provider: config.provider,
          courseId: config.courseId || undefined,
          lessonId: config.lessonId || undefined,
          config: {
            avatarId: config.avatarId || undefined,
            voiceId: config.voiceId || undefined,
            language: config.language,
            aspectRatio: config.aspectRatio,
          },
        }),
      });
      const jobJson = await jobRes.json();
      if (!jobRes.ok) throw new Error(jobJson.error?.message || "Failed to create job");

      const jobId = jobJson.data.id;

      // Generate script
      const scriptRes = await fetch(
        `/api/v1/admin/video-production/jobs/${jobId}/generate-script`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: config.topic,
            targetLocale: config.language,
            riskLevel: config.riskLevel,
            targetDurationSec: config.targetDurationSec,
            additionalInstructions: config.additionalInstructions || undefined,
          }),
        }
      );
      const scriptJson = await scriptRes.json();
      if (!scriptRes.ok) throw new Error(scriptJson.error?.message || "Script generation failed");

      setGeneratedScript(scriptJson.data.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setScriptGenerating(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // Create the job
      const res = await fetch("/api/v1/admin/video-production/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: config.method,
          provider: config.provider,
          courseId: config.courseId || undefined,
          lessonId: config.lessonId || undefined,
          sourceVideoUrl: config.sourceVideoUrl || undefined,
          config: {
            avatarId: config.avatarId || undefined,
            voiceId: config.voiceId || undefined,
            language: config.language,
            aspectRatio: config.aspectRatio,
          },
          ...(config.method === "FACE_SWAP" && {
            faceSwapConfig: {
              targetFaceImageUrl: config.targetFaceImageUrl || undefined,
              blurOriginalFaces: config.blurOriginalFaces,
              preserveExpressions: config.preserveExpressions,
              resolution: config.resolution,
              fidelityLevel: config.fidelityLevel,
            },
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create job");

      router.push(`/admin/video-production/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/video-production">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Video Job</h1>
          <p className="text-sm text-gray-500">
            Create a new AI-generated or face-swap video
          </p>
        </div>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Method Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Choose Production Method
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => {
                update("method", "AI_GENERATED");
                update("provider", "SYNTHESIA");
              }}
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                config.method === "AI_GENERATED"
                  ? "border-brand-500 bg-brand-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Wand2 className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">AI Generated</h3>
              <p className="mt-1 text-sm text-gray-500">
                AI avatar reads script — no filming needed. Uses Synthesia or HeyGen.
              </p>
            </button>
            <button
              onClick={() => {
                update("method", "FACE_SWAP");
                update("provider", "AKOOL");
              }}
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                config.method === "FACE_SWAP"
                  ? "border-brand-500 bg-brand-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                <Video className="h-5 w-5 text-cyan-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Face Swap</h3>
              <p className="mt-1 text-sm text-gray-500">
                Replace faces in existing video — uses Akool or WaveSpeedAI.
              </p>
            </button>
          </div>

          {config.method && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {config.method === "AI_GENERATED" ? (
                  <div className="flex gap-3">
                    {[
                      { id: "SYNTHESIA", label: "Synthesia", cost: "~$3/min" },
                      { id: "HEYGEN", label: "HeyGen", cost: "~$4/min" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => update("provider", p.id)}
                        className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${
                          config.provider === p.id
                            ? "border-brand-500 bg-brand-50/50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-500">{p.cost}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {[
                      { id: "AKOOL", label: "Akool", cost: "~$15/5min" },
                      { id: "WAVESPEED_AI", label: "WaveSpeed AI", cost: "~$6/5min" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => update("provider", p.id)}
                        className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${
                          config.provider === p.id
                            ? "border-brand-500 bg-brand-50/50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-gray-900">{p.label}</p>
                        <p className="text-xs text-gray-500">{p.cost}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {config.method === "AI_GENERATED"
              ? "Avatar & Voice Settings"
              : "Source Video & Face Settings"}
          </h2>

          {config.method === "AI_GENERATED" ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Avatar ID
                  </label>
                  <Input
                    placeholder="e.g., anna_costume1_cameraA"
                    value={config.avatarId}
                    onChange={(e) => update("avatarId", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Leave empty for default avatar
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Voice ID
                  </label>
                  <Input
                    placeholder="e.g., en-US-JennyNeural"
                    value={config.voiceId}
                    onChange={(e) => update("voiceId", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Language
                    </label>
                    <select
                      value={config.language}
                      onChange={(e) => update("language", e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="en">English</option>
                      <option value="ko">Korean</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                      <option value="sw">Swahili</option>
                      <option value="am">Amharic</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Aspect Ratio
                    </label>
                    <select
                      value={config.aspectRatio}
                      onChange={(e) => update("aspectRatio", e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="9:16">9:16 (Portrait)</option>
                      <option value="1:1">1:1 (Square)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Target Duration (seconds)
                  </label>
                  <Input
                    type="number"
                    min={30}
                    max={1800}
                    value={config.targetDurationSec}
                    onChange={(e) =>
                      update("targetDurationSec", parseInt(e.target.value) || 180)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Source Video URL
                  </label>
                  <Input
                    placeholder="https://storage.googleapis.com/..."
                    value={config.sourceVideoUrl}
                    onChange={(e) => update("sourceVideoUrl", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    GCS or publicly accessible video URL
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Target Face Image URL
                  </label>
                  <Input
                    placeholder="https://..."
                    value={config.targetFaceImageUrl}
                    onChange={(e) =>
                      update("targetFaceImageUrl", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Resolution
                    </label>
                    <select
                      value={config.resolution}
                      onChange={(e) => update("resolution", e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="4k">4K</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Fidelity
                    </label>
                    <select
                      value={config.fidelityLevel}
                      onChange={(e) => update("fidelityLevel", e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="low">Low (Faster)</option>
                      <option value="high">High (Better quality)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={config.blurOriginalFaces}
                      onChange={(e) =>
                        update("blurOriginalFaces", e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    Blur original faces
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={config.preserveExpressions}
                      onChange={(e) =>
                        update("preserveExpressions", e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    Preserve expressions
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Script */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {config.method === "AI_GENERATED"
              ? "Generate Script with AI"
              : "Script (Optional)"}
          </h2>

          {config.method === "AI_GENERATED" && (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Topic / Subject
                  </label>
                  <textarea
                    placeholder="e.g., Proper hand hygiene technique for healthcare workers in rural clinics..."
                    value={config.topic}
                    onChange={(e) => update("topic", e.target.value)}
                    rows={3}
                    className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Risk Level
                  </label>
                  <select
                    value={config.riskLevel}
                    onChange={(e) => update("riskLevel", e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="L1">L1 — Low Risk (General knowledge)</option>
                    <option value="L2">L2 — Medium Risk (Clinical procedures)</option>
                    <option value="L3">L3 — High Risk (Life-threatening)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    placeholder="Any specific requirements or context..."
                    value={config.additionalInstructions}
                    onChange={(e) =>
                      update("additionalInstructions", e.target.value)
                    }
                    rows={2}
                    className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>

                {!generatedScript && (
                  <Button
                    onClick={handleGenerateScript}
                    disabled={scriptGenerating || config.topic.length < 5}
                    className="gap-2 bg-brand-500 hover:bg-brand-600"
                  >
                    {scriptGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Script...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Script with AI
                      </>
                    )}
                  </Button>
                )}

                {generatedScript && (
                  <div className="space-y-3 rounded-lg border border-accent-200 bg-accent-50/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {generatedScript.title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {Math.round(generatedScript.totalDurationSec / 60)} min
                      </span>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {generatedScript.segments.map((seg, i) => (
                        <div
                          key={i}
                          className="rounded border border-gray-200 bg-white p-2 text-sm"
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
                              Visual: {seg.visualNotes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {config.method === "FACE_SWAP" && (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-500">
                  Scripts are optional for face swap jobs. The existing video
                  audio will be preserved. You can skip this step.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Review & Submit
          </h2>
          <Card>
            <CardContent className="p-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Method</dt>
                  <dd className="mt-1 text-gray-900">
                    {config.method === "AI_GENERATED"
                      ? "AI Generated"
                      : "Face Swap"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-gray-900">
                    {config.provider?.replace(/_/g, " ")}
                  </dd>
                </div>
                {config.method === "AI_GENERATED" && (
                  <>
                    <div>
                      <dt className="font-medium text-gray-500">Language</dt>
                      <dd className="mt-1 text-gray-900">{config.language}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Duration</dt>
                      <dd className="mt-1 text-gray-900">
                        ~{Math.round(config.targetDurationSec / 60)} minutes
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Risk Level</dt>
                      <dd className="mt-1 text-gray-900">{config.riskLevel}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Aspect Ratio</dt>
                      <dd className="mt-1 text-gray-900">{config.aspectRatio}</dd>
                    </div>
                  </>
                )}
                {config.method === "FACE_SWAP" && (
                  <>
                    <div className="col-span-2">
                      <dt className="font-medium text-gray-500">Source Video</dt>
                      <dd className="mt-1 truncate text-gray-900">
                        {config.sourceVideoUrl}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Resolution</dt>
                      <dd className="mt-1 text-gray-900">{config.resolution}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Fidelity</dt>
                      <dd className="mt-1 text-gray-900">
                        {config.fidelityLevel}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {config.method === "AI_GENERATED" && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    AI-generated content requires review before publishing
                  </p>
                  <p className="mt-1 text-amber-600">
                    The video will enter the risk-based review pipeline after production completes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <Button
          variant="outline"
          onClick={() => step > 1 && setStep((step - 1) as WizardStep)}
          disabled={step === 1}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((step + 1) as WizardStep)}
            disabled={!canProceed()}
            className="gap-1 bg-brand-500 hover:bg-brand-600"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-1 bg-accent-500 hover:bg-accent-600"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create Job
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
