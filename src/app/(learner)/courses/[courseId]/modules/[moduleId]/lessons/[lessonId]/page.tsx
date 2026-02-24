"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  FileText,
  HelpCircle,
  Clock,
  BookOpen,
  Wifi,
  WifiOff,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonData {
  id: string;
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  orderIndex: number;
  contentType: "VIDEO" | "AUDIO" | "TEXT" | "QUIZ" | "MISSION" | "MIXED";
  durationMin: number | null;
  title: string;
  description: string | null;
  isRequired: boolean;
  body: LessonBody;
  progress: {
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    score: number | null;
    timeSpentSec: number;
    lastPosition: number | null;
  } | null;
  navigation: {
    previousLesson: { id: string; title: string; moduleId: string } | null;
    nextLesson: { id: string; title: string; moduleId: string } | null;
    currentIndex: number;
    totalInModule: number;
  };
  keyPoints: string[];
  quiz: QuizData | null;
}

interface LessonBody {
  videoUrl?: string;
  videoPlaybackId?: string;
  audioUrl?: string;
  markdownContent?: string;
  htmlContent?: string;
  notes?: string;
}

interface QuizData {
  id: string;
  questions: QuizQuestion[];
  passingScore: number;
  attemptsAllowed: number;
  attemptsUsed: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  type: "single" | "multiple";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading lesson">
      <SkeletonBlock className="h-3 w-full rounded-full" />
      <SkeletonBlock className="h-5 w-24" />
      <SkeletonBlock className="h-6 w-3/4" />
      <SkeletonBlock className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-4/6" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Video Player ─────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function YouTubePlayer({ videoId }: { videoId: string }) {
  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Lesson video"
        />
      </div>
    </div>
  );
}

function VideoPlayer({
  videoUrl,
  playbackId,
  lastPosition,
  onTimeUpdate,
}: {
  videoUrl?: string;
  playbackId?: string;
  lastPosition?: number | null;
  onTimeUpdate?: (time: number) => void;
}) {
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hlsLoaded, setHlsLoaded] = useState(false);

  // Construct HLS URL from Mux playback ID
  const src = playbackId
    ? `https://stream.mux.com/${playbackId}.m3u8`
    : videoUrl;

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;

    // Check if native HLS is supported (Safari)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      setHlsLoaded(true);
    } else {
      // Dynamically import HLS.js for other browsers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (import("hls.js" as any) as Promise<{ default: any }>)
        .then(({ default: Hls }) => {
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setHlsLoaded(true);
            });
          } else {
            // Fallback to direct src
            video.src = src;
            setHlsLoaded(true);
          }
        })
        .catch(() => {
          // Fallback
          video.src = src;
          setHlsLoaded(true);
        });
    }
  }, [src]);

  // Restore position
  useEffect(() => {
    if (hlsLoaded && videoRef.current && lastPosition && lastPosition > 0) {
      videoRef.current.currentTime = lastPosition;
    }
  }, [hlsLoaded, lastPosition]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  if (youtubeId) {
    return <YouTubePlayer videoId={youtubeId} />;
  }

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          className="h-full w-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
          preload="metadata"
          aria-label="Lesson video"
        />
        {/* Play/Pause overlay for mobile tap */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center focus-visible:outline-none"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          {!isPlaying && (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
              <Play className="ml-1 h-6 w-6 text-gray-900" aria-hidden="true" />
            </div>
          )}
        </button>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          onClick={togglePlay}
          className="text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <span className="text-[10px] text-white/70">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="h-1 flex-1 cursor-pointer accent-brand-400"
          aria-label="Video progress"
        />
        <span className="text-[10px] text-white/70">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({
  audioUrl,
  lastPosition,
  onTimeUpdate,
}: {
  audioUrl: string;
  lastPosition?: number | null;
  onTimeUpdate?: (time: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current && lastPosition && lastPosition > 0) {
      audioRef.current.currentTime = lastPosition;
    }
  }, [lastPosition]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Generate waveform bars (static visualization)
  const bars = Array.from({ length: 40 }, (_, i) => {
    const height = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
    return height;
  });

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
          )}
        </button>
        <div className="flex-1">
          {/* Waveform visualization */}
          <div
            className="mb-2 flex items-end gap-px"
            style={{ height: "36px" }}
            role="img"
            aria-label="Audio waveform"
          >
            {bars.map((h, i) => {
              const barProgress = (i / bars.length) * 100;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-sm transition-colors",
                    barProgress <= progressPct
                      ? "bg-brand-400"
                      : "bg-gray-200"
                  )}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="h-1 flex-1 cursor-pointer accent-brand-400"
              aria-label="Audio progress"
            />
            <span className="text-[10px] text-gray-400">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Markdown Content ─────────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  // Basic markdown-to-HTML rendering (safe content from backend)
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-900 prose-a:text-brand-500 prose-strong:text-gray-900"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// ─── Quiz Section ─────────────────────────────────────────────────────────────

function QuizSection({
  quiz,
  lessonId,
  onComplete,
  tq,
}: {
  quiz: QuizData;
  lessonId: string;
  onComplete: (passed: boolean, score: number) => void;
  tq: ReturnType<typeof useTranslations>;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    correctAnswers: Record<string, string | string[]>;
  } | null>(null);

  const canAttempt =
    quiz.attemptsAllowed === 0 || quiz.attemptsUsed < quiz.attemptsAllowed;

  const handleOptionSelect = (questionId: string, optionId: string, type: string) => {
    if (submitted) return;
    setAnswers((prev) => {
      if (type === "multiple") {
        const current = (prev[questionId] as string[]) || [];
        const updated = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: optionId };
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/learner/lessons/${lessonId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error("Failed to submit quiz");
      const json = await res.json();
      setResult(json.data);
      setSubmitted(true);
      onComplete(json.data.passed, json.data.score);
    } catch (err) {
      // Allow retry
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
    setSubmitting(false);
  };

  const allAnswered = quiz.questions.every((q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (Array.isArray(a)) return a.length > 0;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {tq("knowledgeCheck")}
        </h3>
        {quiz.attemptsAllowed > 0 && (
          <span className="text-[10px] text-gray-400">
            {tq("attempt", { used: quiz.attemptsUsed + (submitted ? 1 : 0), total: quiz.attemptsAllowed })}
          </span>
        )}
      </div>

      {/* Result Banner */}
      {result && (
        <div
          className={cn(
            "rounded-xl p-4 text-center",
            result.passed
              ? "bg-accent-50 text-accent-700"
              : "bg-red-50 text-red-700"
          )}
          role="alert"
        >
          <p className="text-lg font-bold">
            {result.passed ? tq("passed") : tq("notPassed")}
          </p>
          <p className="text-sm">
            {tq("score", { score: Math.round(result.score * 100), passing: Math.round(quiz.passingScore * 100) })}
          </p>
        </div>
      )}

      {/* Questions */}
      {quiz.questions.map((question, qIndex) => (
        <div
          key={question.id}
          className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <p className="mb-3 text-sm font-medium text-gray-900">
            <span className="mr-1.5 text-xs text-gray-400">
              Q{qIndex + 1}.
            </span>
            {question.question}
          </p>
          <div className="space-y-2" role="radiogroup" aria-label={`Question ${qIndex + 1}`}>
            {question.options.map((option) => {
              const isSelected = question.type === "multiple"
                ? ((answers[question.id] as string[]) || []).includes(option.id)
                : answers[question.id] === option.id;

              const isCorrectAnswer = result?.correctAnswers?.[question.id] === option.id ||
                (Array.isArray(result?.correctAnswers?.[question.id]) &&
                  (result.correctAnswers[question.id] as string[]).includes(option.id));

              return (
                <button
                  key={option.id}
                  onClick={() =>
                    handleOptionSelect(question.id, option.id, question.type)
                  }
                  disabled={submitted}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    submitted && isCorrectAnswer
                      ? "border-accent-300 bg-accent-50"
                      : submitted && isSelected && !isCorrectAnswer
                        ? "border-red-300 bg-red-50"
                        : isSelected
                          ? "border-brand-300 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    submitted && "cursor-default"
                  )}
                  role={question.type === "multiple" ? "checkbox" : "radio"}
                  aria-checked={isSelected}
                  aria-label={option.text}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
                      isSelected
                        ? "border-brand-500 bg-brand-500"
                        : "border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="flex-1">{option.text}</span>
                  {submitted && isCorrectAnswer && (
                    <CheckCircle2
                      className="h-4 w-4 text-accent-500"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Submit / Retry */}
      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting || !canAttempt}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              {tq("submitting")}
            </>
          ) : !canAttempt ? (
            tq("noAttemptsRemaining")
          ) : (
            tq("submitAnswers")
          )}
        </Button>
      ) : (
        result &&
        !result.passed &&
        canAttempt && (
          <Button onClick={handleRetry} variant="outline" className="w-full">
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {tq("tryAgain")}
          </Button>
        )
      )}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function LessonViewerPage() {
  const params = useParams<{
    courseId: string;
    moduleId: string;
    lessonId: string;
  }>();
  const router = useRouter();
  const tl = useTranslations("lesson");
  const tq = useTranslations("quiz");
  const tc = useTranslations("common");
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const lastPositionRef = useRef(0);
  const timeSpentRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLesson = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/v1/learner/courses/${params.courseId}/modules/${params.moduleId}/lessons/${params.lessonId}`
      );
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error(`Failed to load lesson (${res.status})`);
      const json = await res.json();
      setLesson(json.data);
      setIsCompleted(json.data.progress?.status === "COMPLETED");
      if (json.data.progress?.lastPosition) {
        lastPositionRef.current = json.data.progress.lastPosition;
      }
      timeSpentRef.current = json.data.progress?.timeSpentSec ?? 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }, [params.courseId, params.moduleId, params.lessonId]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  // Track time spent
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      timeSpentRef.current += 1;
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      if (lesson) {
        fetch(
          `/api/v1/learner/courses/${params.courseId}/modules/${params.moduleId}/lessons/${params.lessonId}/progress`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timeSpentSec: timeSpentRef.current,
              lastPosition: lastPositionRef.current,
              status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
            }),
            keepalive: true,
          }
        ).catch(() => {
          // Silently fail - will sync later
        });
      }
    };
  }, [lesson, params, isCompleted]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleVideoTimeUpdate = (time: number) => {
    lastPositionRef.current = time;
  };

  const handleMarkComplete = async () => {
    if (marking || !lesson) return;
    try {
      setMarking(true);
      const res = await fetch(
        `/api/v1/learner/courses/${params.courseId}/modules/${params.moduleId}/lessons/${params.lessonId}/progress`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "COMPLETED",
            timeSpentSec: timeSpentRef.current,
            lastPosition: lastPositionRef.current,
          }),
        }
      );
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok) throw new Error("Failed to mark complete");
      setIsCompleted(true);
      triggerLogoBounce();
    } catch {
      // Show error state briefly then allow retry
    } finally {
      setMarking(false);
    }
  };

  const handleQuizComplete = (passed: boolean, score: number) => {
    if (passed) {
      setIsCompleted(true);
      triggerLogoBounce();
    }
  };

  const triggerLogoBounce = () => {
    const logo = document.querySelector("[data-logo-bounce]");
    if (logo) {
      logo.classList.add("animate-bounce-logo");
      setTimeout(() => logo.classList.remove("animate-bounce-logo"), 2200);
    }
  };

  if (loading) return <LessonSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-gray-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchLesson}>
          {tc("tryAgain")}
        </Button>
      </div>
    );
  }

  if (!lesson) return null;

  const { navigation } = lesson;
  const progressInModule =
    navigation.totalInModule > 0
      ? Math.round(
          ((navigation.currentIndex + (isCompleted ? 1 : 0)) /
            navigation.totalInModule) *
            100
        )
      : 0;

  return (
    <div className="space-y-5 pb-24">
      {/* Module Progress Bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
          <span>{lesson.moduleTitle}</span>
          <span>
            {tl("of", { current: navigation.currentIndex + 1, total: navigation.totalInModule })}
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={progressInModule}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Module progress: lesson ${navigation.currentIndex + 1} of ${navigation.totalInModule}`}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progressInModule}%` }}
          />
        </div>
      </div>

      {/* Back Navigation */}
      <button
        onClick={() => router.push(`/courses/${params.courseId}`)}
        className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label="Back to course overview"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {lesson.courseTitle}
      </button>

      {/* Lesson Header */}
      <header>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase text-gray-400">
            {lesson.contentType}
          </span>
          {lesson.durationMin && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              {tl("min", { count: lesson.durationMin })}
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-accent-600">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {tl("completed")}
            </span>
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{lesson.title}</h1>
        {lesson.description && (
          <p className="mt-1 text-sm text-gray-500">{lesson.description}</p>
        )}
      </header>

      {/* Offline Indicator */}
      {!isOnline && (
        <div
          className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          {tc("viewingCachedContent")}
        </div>
      )}

      {/* Content Area */}
      <div className="space-y-5">
        {/* Video Content */}
        {(lesson.contentType === "VIDEO" || lesson.contentType === "MIXED") &&
          (lesson.body.videoUrl || lesson.body.videoPlaybackId) && (
            <VideoPlayer
              videoUrl={lesson.body.videoUrl}
              playbackId={lesson.body.videoPlaybackId}
              lastPosition={lesson.progress?.lastPosition}
              onTimeUpdate={handleVideoTimeUpdate}
            />
          )}

        {/* Audio Content */}
        {(lesson.contentType === "AUDIO" || lesson.contentType === "MIXED") &&
          lesson.body.audioUrl && (
            <AudioPlayer
              audioUrl={lesson.body.audioUrl}
              lastPosition={lesson.progress?.lastPosition}
              onTimeUpdate={handleVideoTimeUpdate}
            />
          )}

        {/* Text / Markdown Content */}
        {(lesson.contentType === "TEXT" || lesson.contentType === "MIXED") &&
          (lesson.body.markdownContent || lesson.body.htmlContent) && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              {lesson.body.htmlContent ? (
                <MarkdownContent content={lesson.body.htmlContent} />
              ) : lesson.body.markdownContent ? (
                <MarkdownContent content={lesson.body.markdownContent} />
              ) : null}
            </div>
          )}

        {/* Notes / Key Points */}
        {lesson.keyPoints.length > 0 && (
          <section
            className="rounded-xl border border-gray-100 bg-brand-50/50 p-4 shadow-sm"
            aria-labelledby="key-points-heading"
          >
            <h2
              id="key-points-heading"
              className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"
            >
              <BookOpen className="h-4 w-4 text-brand-500" aria-hidden="true" />
              {tl("keyPoints")}
            </h2>
            <ul className="space-y-2">
              {lesson.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-600">
                    {i + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Lesson Notes */}
        {lesson.body.notes && (
          <section
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            aria-labelledby="notes-heading"
          >
            <h2
              id="notes-heading"
              className="mb-2 text-sm font-semibold text-gray-900"
            >
              {tl("lessonNotes")}
            </h2>
            <div className="text-sm leading-relaxed text-gray-600">
              {lesson.body.notes}
            </div>
          </section>
        )}

        {/* Quiz Section */}
        {lesson.quiz && (
          <section aria-labelledby="quiz-heading">
            <QuizSection
              quiz={lesson.quiz}
              lessonId={lesson.id}
              onComplete={handleQuizComplete}
              tq={tq}
            />
          </section>
        )}

        {/* Mark Complete Button */}
        {!isCompleted && lesson.contentType !== "QUIZ" && (
          <Button
            onClick={handleMarkComplete}
            disabled={marking}
            className="w-full"
            size="lg"
          >
            {marking ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                {tl("markingComplete")}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {tl("markAsComplete")}
              </>
            )}
          </Button>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-accent-50 py-3 text-sm font-medium text-accent-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {tl("lessonCompleted")}
          </div>
        )}
      </div>

      {/* Navigation: Previous / Next */}
      <nav
        className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-100 bg-white px-4 py-3"
        aria-label="Lesson navigation"
      >
        <div className="flex items-center justify-between gap-3">
          {navigation.previousLesson ? (
            <Link
              href={`/courses/${params.courseId}/modules/${navigation.previousLesson.moduleId}/lessons/${navigation.previousLesson.id}`}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label={`Previous lesson: ${navigation.previousLesson.title}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="max-w-[100px] truncate">{tl("previousLesson")}</span>
            </Link>
          ) : (
            <div />
          )}

          {navigation.nextLesson ? (
            <Link
              href={`/courses/${params.courseId}/modules/${navigation.nextLesson.moduleId}/lessons/${navigation.nextLesson.id}`}
              className={cn(
                "flex items-center gap-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                isCompleted
                  ? "text-brand-600 hover:text-brand-700"
                  : "text-gray-600 hover:text-gray-900"
              )}
              aria-label={`Next lesson: ${navigation.nextLesson.title}`}
            >
              <span className="max-w-[100px] truncate">{tl("nextLesson")}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link
              href={`/courses/${params.courseId}`}
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {tl("backToCourse")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
