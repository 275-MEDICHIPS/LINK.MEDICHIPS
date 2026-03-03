"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  AlertCircle,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import VoicePicker from "../_components/VoicePicker";
import AvatarPicker from "../_components/AvatarPicker";
import CourseLessonPicker from "../_components/CourseLessonPicker";
import SceneStoryboard from "../_components/SceneStoryboard";
import { csrfHeaders } from "@/lib/utils/csrf";

// ─── Types ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface JobConfig {
  method: "AI_GENERATED" | "FACE_SWAP" | null;
  provider: string;
  // Avatar & Voice
  avatarId: string;
  voicePresetId: string;
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

interface ScriptSegment {
  speakerLabel: string;
  text: string;
  durationSec: number;
  visualNotes?: string;
}

// ─── Step Indicator ─────────────────────────────────────────────────

const AI_STEPS = [
  { num: 1, label: "Method" },
  { num: 2, label: "Voice & Avatar" },
  { num: 3, label: "Configure" },
  { num: 4, label: "Script" },
  { num: 5, label: "Scenes" },
  { num: 6, label: "Render" },
  { num: 7, label: "Review" },
  { num: 8, label: "Publish" },
];

const FACESWAP_STEPS = [
  { num: 1, label: "Method" },
  { num: 2, label: "Configure" },
  { num: 3, label: "Review" },
];

function StepIndicator({
  current,
  isAI,
}: {
  current: WizardStep;
  isAI: boolean;
}) {
  const steps = isAI ? AI_STEPS : FACESWAP_STEPS;
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
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
          {i < steps.length - 1 && (
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
  const searchParams = useSearchParams();
  const [step, setStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<{
    title: string;
    segments: ScriptSegment[];
    totalDurationSec: number;
  } | null>(null);
  const [editableSegments, setEditableSegments] = useState<ScriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Scene workflow state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scenes, setScenes] = useState<any[]>([]);
  const [renderingInProgress, setRenderingInProgress] = useState(false);

  // Selected voice/avatar names for review display
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [selectedAvatarName, setSelectedAvatarName] = useState("");

  // Course settings inherited info
  const [courseSettingsInherited, setCourseSettingsInherited] = useState(false);

  const [config, setConfig] = useState<JobConfig>({
    method: null,
    provider: "",
    avatarId: "",
    voicePresetId: "",
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

  // Pre-fill from URL parameters (from Course Editor's "Generate AI Video")
  const isFromCourse = !!(searchParams.get("courseId") || searchParams.get("lessonId"));

  useEffect(() => {
    const urlCourseId = searchParams.get("courseId");
    const urlLessonId = searchParams.get("lessonId");
    if (urlCourseId || urlLessonId) {
      setConfig((prev) => ({
        ...prev,
        courseId: urlCourseId || prev.courseId,
        lessonId: urlLessonId || prev.lessonId,
      }));
    }
  }, [searchParams]);

  function update(key: keyof JobConfig, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  const isAI = config.method === "AI_GENERATED";
  const maxStep: WizardStep = isAI ? 8 : 3;

  const canProceed = (): boolean => {
    if (isAI) {
      switch (step) {
        case 1: return config.method !== null && config.provider !== "";
        case 2: return true; // Voice & Avatar optional
        case 3: return true; // Configure optional
        case 4: return config.topic.length >= 5; // Script topic required
        case 5: return scenes.length > 0; // Scenes configured
        case 6: return !renderingInProgress; // Rendering done
        case 7: return true; // Review
        case 8: return true; // Publish
        default: return false;
      }
    }
    // Face Swap: 3 steps
    switch (step) {
      case 1: return config.method !== null && config.provider !== "";
      case 2: return config.sourceVideoUrl.length > 0; // Source video required
      case 3: return true; // Review
      default: return false;
    }
  };

  function updateSegmentText(index: number, text: string) {
    setEditableSegments((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text };
      return next;
    });
  }

  function updateSegmentDuration(index: number, delta: number) {
    setEditableSegments((prev) => {
      const next = [...prev];
      const newDur = Math.max(1, next[index].durationSec + delta);
      next[index] = { ...next[index], durationSec: newDur };
      return next;
    });
  }

  // ─── AI Scene Workflow Handlers ────────────────────────────────

  async function handleAIGenerateScript() {
    setScriptGenerating(true);
    setError(null);
    try {
      // Create AI video production job
      const jobRes = await fetch("/api/v1/admin/video-production/jobs", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          method: "AI_GENERATED",
          provider: config.provider,
          courseId: config.courseId || undefined,
          lessonId: config.lessonId || undefined,
          avatarId: config.avatarId || undefined,
          voicePresetId: config.voicePresetId || undefined,
          topicInput: config.topic,
          config: {
            voiceId: config.voiceId || undefined,
            language: config.language,
            aspectRatio: config.aspectRatio,
          },
        }),
      });
      const jobJson = await jobRes.json();
      if (!jobRes.ok) throw new Error(jobJson.error?.message || "Failed to create job");

      const jobId = jobJson.data.id;
      setCurrentJobId(jobId);

      // Generate script
      const scriptRes = await fetch(
        `/api/v1/admin/video-production/jobs/${jobId}/generate-script`,
        {
          method: "POST",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
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

      const script = scriptJson.data.script;
      setGeneratedScript(script);
      setEditableSegments(script.segments.map((s: ScriptSegment) => ({ ...s })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setScriptGenerating(false);
    }
  }

  async function handleApproveScript() {
    if (!currentJobId) return;
    setSubmitting(true);
    setError(null);
    try {
      // Approve script → transitions to SCENE_SETUP + hydrates scenes
      const res = await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/approve-script`,
        { method: "POST", headers: csrfHeaders() }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to approve script");
      }

      // Fetch hydrated scenes
      const scenesRes = await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/scenes`,
        { headers: csrfHeaders() }
      );
      const scenesJson = await scenesRes.json();
      if (scenesRes.ok) {
        setScenes(scenesJson.data.scenes);
      }

      setStep(5); // Move to Scene Setup step (AI Step 5)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartRendering() {
    if (!currentJobId) return;
    setRenderingInProgress(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/start-rendering`,
        { method: "POST", headers: csrfHeaders() }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to start rendering");
      }
      setStep(6); // Move to Rendering step (AI Step 6)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setRenderingInProgress(false);
    }
  }

  async function handleRefreshScenes() {
    if (!currentJobId) return;
    try {
      const res = await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/scenes`,
        { headers: csrfHeaders() }
      );
      const json = await res.json();
      if (res.ok) {
        setScenes(json.data.scenes);
        // Check if all scenes are done
        const allDone = json.data.scenes.every(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.renderStatus === "COMPLETED" || s.renderStatus === "SKIPPED"
        );
        if (allDone && renderingInProgress) {
          setRenderingInProgress(false);
        }
      }
    } catch {
      // silent refresh failure
    }
  }

  async function handleSceneSourceChange(sceneId: string, source: string) {
    if (!currentJobId) return;
    try {
      const res = await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/scenes/${sceneId}`,
        {
          method: "PATCH",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ source }),
        }
      );
      if (res.ok) {
        setScenes((prev) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prev.map((s: any) => (s.id === sceneId ? { ...s, source } : s))
        );
      }
    } catch {
      // silent
    }
  }

  function handleSceneUploadComplete(sceneId: string, url: string) {
    setScenes((prev) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prev.map((s: any) =>
        s.id === sceneId
          ? { ...s, uploadedVideoUrl: url, renderStatus: "COMPLETED" }
          : s
      )
    );
  }

  async function handleSceneReRender(sceneId: string) {
    if (!currentJobId) return;
    try {
      await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/scenes/${sceneId}/re-render`,
        { method: "POST", headers: csrfHeaders() }
      );
      handleRefreshScenes();
    } catch {
      // silent
    }
  }

  async function handleFinalize() {
    if (!currentJobId) return;
    setSubmitting(true);
    try {
      // Check and merge all scenes
      const mergeRes = await fetch(
        `/api/v1/admin/video-production/jobs/${currentJobId}/check-scenes`,
        { method: "POST", headers: csrfHeaders() }
      );
      const mergeJson = await mergeRes.json();
      if (!mergeRes.ok) throw new Error(mergeJson.error?.message || "Merge failed");

      router.push(`/admin/video-production/${currentJobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSubmitting(false);
    }
  }

  // Auto-refresh scenes during rendering
  useEffect(() => {
    if (!renderingInProgress || !currentJobId) return;
    const interval = setInterval(handleRefreshScenes, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderingInProgress, currentJobId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/video-production/jobs", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          method: config.method,
          provider: config.provider,
          courseId: config.courseId || undefined,
          lessonId: config.lessonId || undefined,
          avatarId: config.avatarId || undefined,
          voicePresetId: config.voicePresetId || undefined,
          sourceVideoUrl: config.sourceVideoUrl || undefined,
          config: {
            voiceId: config.voiceId || undefined,
            language: config.language,
            aspectRatio: config.aspectRatio,
          },
          ...(config.method === "FACE_SWAP" && {
            faceSwapConfig: {
              targetFaceImageUrl:
                config.targetFaceImageUrl || undefined,
              blurOriginalFaces: config.blurOriginalFaces,
              preserveExpressions: config.preserveExpressions,
              resolution: config.resolution,
              fidelityLevel: config.fidelityLevel,
            },
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error?.message || "Failed to create job");

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

      <StepIndicator current={step} isAI={isAI} />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Step 1: Method Selection ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Show linked course info first when coming from course editor */}
          {isFromCourse && (
            <CourseLessonPicker
              courseId={config.courseId}
              lessonId={config.lessonId}
              onCourseChange={(id) => update("courseId", id)}
              onLessonChange={(id) => update("lessonId", id)}
              onSettingsLoaded={(settings) => {
                if (settings.avatarId) update("avatarId", settings.avatarId);
                if (settings.voicePresetId) update("voicePresetId", settings.voicePresetId);
                if (settings.targetLocale) update("language", settings.targetLocale);
                setCourseSettingsInherited(true);
              }}
              locked
            />
          )}

          <h2 className="text-lg font-semibold text-gray-900">
            Choose Production Method
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => {
                update("method", "AI_GENERATED");
                update("provider", "VEO");
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
                AI 스크립트 → Scene별 영상 소스 선택 → 부분 재렌더링.
                Google Veo 3.1 사용.
              </p>
              <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Scene별 의사 영상으로 비용 최대 80% 절감
              </span>
            </button>
            <button
              onClick={() => {
                update("method", "FACE_SWAP");
                update("provider", "VEO");
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
                기존 영상에서 얼굴 교체. Google Veo 3.1 사용.
              </p>
            </button>
          </div>

          {config.method && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Select Provider</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border-2 border-brand-500 bg-brand-50/50 p-3 text-left">
                    <p className="font-medium text-gray-900">
                      Google Veo 3.1
                    </p>
                    <p className="text-xs text-gray-500">GCP 크레딧</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course & Lesson Picker (only when NOT from course editor) */}
          {config.method && !isFromCourse && (
            <CourseLessonPicker
              courseId={config.courseId}
              lessonId={config.lessonId}
              onCourseChange={(id) => update("courseId", id)}
              onLessonChange={(id) => update("lessonId", id)}
              onSettingsLoaded={(settings) => {
                if (settings.avatarId) update("avatarId", settings.avatarId);
                if (settings.voicePresetId) update("voicePresetId", settings.voicePresetId);
                if (settings.targetLocale) update("language", settings.targetLocale);
                setCourseSettingsInherited(true);
              }}
            />
          )}
        </div>
      )}

      {/* ─── AI Step 2: Voice & Avatar ─────────────────────────── */}
      {isAI && step === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Voice & Avatar
          </h2>

          {/* Avatar Picker */}
          <Card>
            <CardContent className="p-5">
              <AvatarPicker
                selectedAvatarId={config.avatarId}
                onSelect={(id) => {
                  update("avatarId", id);
                  setSelectedAvatarName(id ? "(selected)" : "");
                }}
              />
            </CardContent>
          </Card>

          {/* Voice Picker */}
          <Card>
            <CardContent className="p-5">
              <VoicePicker
                selectedPresetId={config.voicePresetId}
                onSelect={(id) => {
                  update("voicePresetId", id);
                  setSelectedVoiceName(id ? "(selected)" : "");
                }}
                language={config.language}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── AI Step 3: Configuration ─────────────────────────────── */}
      {isAI && step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Video Settings
          </h2>

          {config.method === "AI_GENERATED" && (
            <Card>
              <CardContent className="space-y-4 p-6">
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
                      onChange={(e) =>
                        update("aspectRatio", e.target.value)
                      }
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
                      update(
                        "targetDurationSec",
                        parseInt(e.target.value) || 180
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Face Swap Step 2: Source & Face Config ──────────────── */}
      {!isAI && step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Source Video & Face Settings
          </h2>
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
                  onChange={(e) => update("targetFaceImageUrl", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Resolution</label>
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Fidelity</label>
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
                  <input type="checkbox" checked={config.blurOriginalFaces} onChange={(e) => update("blurOriginalFaces", e.target.checked)} className="rounded border-gray-300" />
                  Blur original faces
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={config.preserveExpressions} onChange={(e) => update("preserveExpressions", e.target.checked)} className="rounded border-gray-300" />
                  Preserve expressions
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Face Swap Step 3: Review & Submit ──────────────────── */}
      {!isAI && step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Review & Submit</h2>
          <Card>
            <CardContent className="p-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Method</dt>
                  <dd className="mt-1 text-gray-900">Face Swap</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-gray-900">{config.provider}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-medium text-gray-500">Source Video</dt>
                  <dd className="mt-1 truncate text-gray-900">{config.sourceVideoUrl}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Resolution</dt>
                  <dd className="mt-1 text-gray-900">{config.resolution}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Fidelity</dt>
                  <dd className="mt-1 text-gray-900">{config.fidelityLevel}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-1 bg-accent-500 hover:bg-accent-600"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              <><Check className="h-4 w-4" /> Create Job</>
            )}
          </Button>
        </div>
      )}


      {/* ─── AI Step 4: Script Generation & Edit ────────────────── */}
      {isAI && step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            AI 스크립트 생성
          </h2>
          <Card>
            <CardContent className="space-y-4 p-6">
              {!generatedScript && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      주제 (Topic)
                    </label>
                    <textarea
                      placeholder="예: 농촌 의료진을 위한 올바른 손 위생 기술..."
                      value={config.topic}
                      onChange={(e) => update("topic", e.target.value)}
                      rows={4}
                      className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Risk Level</label>
                      <select
                        value={config.riskLevel}
                        onChange={(e) => update("riskLevel", e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="L1">L1 — Low Risk</option>
                        <option value="L2">L2 — Medium Risk</option>
                        <option value="L3">L3 — High Risk</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">추가 지시사항</label>
                      <Input
                        placeholder="특별 요구사항 (선택)"
                        value={config.additionalInstructions}
                        onChange={(e) => update("additionalInstructions", e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAIGenerateScript}
                    disabled={scriptGenerating || config.topic.length < 5}
                    className="gap-2 bg-brand-500 hover:bg-brand-600"
                  >
                    {scriptGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        스크립트 생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI로 스크립트 생성
                      </>
                    )}
                  </Button>
                </>
              )}

              {generatedScript && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      {generatedScript.title}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {editableSegments.reduce((sum, s) => sum + s.durationSec, 0)}s total •{" "}
                      {editableSegments.length} scenes
                    </span>
                  </div>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {editableSegments.map((seg, i) => (
                      <div key={i} className="rounded border border-gray-200 bg-white p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-brand-600">
                            Scene {i + 1}: {seg.speakerLabel}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateSegmentDuration(i, -5)} className="rounded p-0.5 hover:bg-gray-100">
                              <Minus className="h-3 w-3 text-gray-400" />
                            </button>
                            <span className="w-8 text-center text-xs text-gray-400">{seg.durationSec}s</span>
                            <button onClick={() => updateSegmentDuration(i, 5)} className="rounded p-0.5 hover:bg-gray-100">
                              <Plus className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={seg.text}
                          onChange={(e) => updateSegmentText(i, e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded border-0 bg-transparent p-0 text-sm text-gray-700 focus:ring-0"
                        />
                        {seg.visualNotes && (
                          <p className="mt-1 text-xs italic text-gray-400">Visual: {seg.visualNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleApproveScript}
                    disabled={submitting}
                    className="gap-2 bg-accent-500 hover:bg-accent-600"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scene 생성 중...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        스크립트 승인 → Scene 설정으로
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── AI Step 5: Scene Setup ─────────────────────────────── */}
      {isAI && step === 5 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Scene별 소스 선택
          </h2>
          <p className="text-sm text-gray-500">
            각 Scene의 영상 소스를 선택하세요. 의사 영상을 업로드하면 AI 렌더링 비용을 절감할 수 있습니다.
          </p>
          <SceneStoryboard
            scenes={scenes}
            mode="setup"
            jobId={currentJobId || ""}
            onSourceChange={handleSceneSourceChange}
            onUploadComplete={handleSceneUploadComplete}
            onReorder={async (order) => {
              if (!currentJobId) return;
              await fetch(
                `/api/v1/admin/video-production/jobs/${currentJobId}/scenes`,
                {
                  method: "POST",
                  headers: csrfHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify({ sceneOrder: order }),
                }
              );
              handleRefreshScenes();
            }}
          />

          <Button
            onClick={handleStartRendering}
            disabled={renderingInProgress}
            className="gap-2 bg-brand-500 hover:bg-brand-600"
          >
            <Sparkles className="h-4 w-4" />
            AI Scene 렌더링 시작
          </Button>
        </div>
      )}

      {/* ─── AI Step 6: Rendering Progress ─────────────────────── */}
      {isAI && step === 6 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            렌더링 진행
          </h2>
          <SceneStoryboard
            scenes={scenes}
            mode="rendering"
            jobId={currentJobId || ""}
          />
          {renderingInProgress && (
            <div className="flex items-center gap-2 text-sm text-brand-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scene별 AI 렌더링 진행 중... (10초마다 자동 새로고침)
            </div>
          )}
          {!renderingInProgress && (
            <Button
              onClick={() => setStep(7)}
              className="gap-2 bg-accent-500 hover:bg-accent-600"
            >
              <Check className="h-4 w-4" />
              렌더링 완료 → 검수하기
            </Button>
          )}
        </div>
      )}

      {/* ─── AI Step 7: Final Review ──────────────────────────── */}
      {isAI && step === 7 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            최종 검수
          </h2>
          <p className="text-sm text-gray-500">
            각 Scene을 확인하고, 필요하면 부분 재렌더링할 수 있습니다.
          </p>
          <SceneStoryboard
            scenes={scenes}
            mode="review"
            jobId={currentJobId || ""}
            onReRender={handleSceneReRender}
          />
        </div>
      )}

      {/* ─── AI Step 8: Publish ──────────────────────────────── */}
      {isAI && step === 8 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            발행
          </h2>
          <Card>
            <CardContent className="space-y-4 p-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">Method</dt>
                  <dd className="mt-1 text-gray-900">AI Generated</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-gray-900">{config.provider}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Total Scenes</dt>
                  <dd className="mt-1 text-gray-900">{scenes.length}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">Doctor Videos</dt>
                  <dd className="mt-1 text-gray-900">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {scenes.filter((s: any) => s.source === "DOCTOR_VIDEO").length}
                  </dd>
                </div>
              </dl>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-700">
                  비용 절감 효과
                </p>
                <p className="mt-1 text-sm text-emerald-600">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  의사 영상 {scenes.filter((s: any) => s.source === "DOCTOR_VIDEO").length}개 Scene으로
                  {" "}${(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    scenes.filter((s: any) => s.source === "DOCTOR_VIDEO")
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .reduce((sum: number, s: any) => sum + s.durationSec * 0.35, 0)
                  ).toFixed(2)} 절감
                </p>
              </div>

              <Button
                onClick={handleFinalize}
                disabled={submitting}
                className="gap-2 bg-accent-500 hover:bg-accent-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    최종 합치기 진행 중...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Scene 합치기 → 발행
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Navigation Buttons ────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <Button
          variant="outline"
          onClick={() =>
            step > 1 && setStep((step - 1) as WizardStep)
          }
          disabled={step === 1}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {isAI ? (
          // AI: Steps 1-3 have Next buttons, Steps 4-6,8 have internal buttons, Step 7 has Next
          step <= 3 ? (
            <Button
              onClick={() => setStep((step + 1) as WizardStep)}
              disabled={!canProceed()}
              className="gap-1 bg-brand-500 hover:bg-brand-600"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : step === 7 ? (
            <Button
              onClick={() => setStep(8)}
              disabled={!canProceed()}
              className="gap-1 bg-brand-500 hover:bg-brand-600"
            >
              발행으로
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null
        ) : step < 3 ? (
          <Button
            onClick={() => setStep((step + 1) as WizardStep)}
            disabled={!canProceed()}
            className="gap-1 bg-brand-500 hover:bg-brand-600"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
