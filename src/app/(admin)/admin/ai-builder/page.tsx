"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  Eye,
  Pencil,
  Rocket,
  Check,
  ChevronRight,
  X,
  Loader2,
  GripVertical,
  Video,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedLesson {
  id: string;
  title: string;
  contentType: "text" | "video" | "quiz";
  summary: string;
  content: string;
}

interface GeneratedModule {
  id: string;
  title: string;
  lessons: GeneratedLesson[];
}

interface GeneratedCourse {
  title: string;
  description: string;
  specialty: string;
  modules: GeneratedModule[];
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface JobHistoryItem {
  id: string;
  fileName: string;
  status: "completed" | "processing" | "failed";
  createdAt: string;
  courseTitle: string;
  modules: number;
  lessons: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockGenerated: GeneratedCourse = {
  title: "Infection Prevention and Control in Healthcare Facilities",
  description:
    "Comprehensive training on infection prevention and control (IPC) measures for healthcare workers in resource-limited settings, based on the WHO IPC guidelines SOP.",
  specialty: "Infectious Disease",
  modules: [
    {
      id: "gm_1",
      title: "Foundations of IPC",
      lessons: [
        { id: "gl_1", title: "Introduction to IPC", contentType: "text", summary: "Overview of infection prevention principles", content: "Infection Prevention and Control (IPC) is a practical, evidence-based approach that prevents patients, healthcare workers, and visitors from being harmed by avoidable infections." },
        { id: "gl_2", title: "Chain of Infection", contentType: "text", summary: "Understanding how infections spread", content: "The chain of infection consists of six links: the infectious agent, the reservoir, the portal of exit, the mode of transmission, the portal of entry, and the susceptible host." },
        { id: "gl_3", title: "IPC Knowledge Check", contentType: "quiz", summary: "Assessment on IPC foundations", content: "" },
      ],
    },
    {
      id: "gm_2",
      title: "Hand Hygiene",
      lessons: [
        { id: "gl_4", title: "5 Moments of Hand Hygiene", contentType: "text", summary: "WHO 5 moments framework", content: "The WHO 5 moments for hand hygiene are: before touching a patient, before clean/aseptic procedures, after body fluid exposure risk, after touching a patient, and after touching patient surroundings." },
        { id: "gl_5", title: "Hand Hygiene Technique Demo", contentType: "video", summary: "Video demonstration of proper technique", content: "" },
        { id: "gl_6", title: "Hand Hygiene Assessment", contentType: "quiz", summary: "Practical assessment", content: "" },
      ],
    },
    {
      id: "gm_3",
      title: "Personal Protective Equipment",
      lessons: [
        { id: "gl_7", title: "Types of PPE", contentType: "text", summary: "Overview of PPE categories", content: "Personal Protective Equipment includes gloves, gowns, masks, respirators, eye protection, and face shields. Selection depends on the type of patient interaction and the nature of the infectious agent." },
        { id: "gl_8", title: "Donning and Doffing Procedures", contentType: "video", summary: "Step-by-step PPE procedures", content: "" },
        { id: "gl_9", title: "PPE Assessment", contentType: "quiz", summary: "Assessment on PPE usage", content: "" },
      ],
    },
  ],
};

const mockJobHistory: JobHistoryItem[] = [
  { id: "job_001", fileName: "WHO_IPC_Guidelines.pdf", status: "completed", createdAt: "2026-02-23 14:30", courseTitle: "Infection Prevention and Control", modules: 3, lessons: 9 },
  { id: "job_002", fileName: "Emergency_Triage_SOP.docx", status: "completed", createdAt: "2026-02-22 09:15", courseTitle: "Emergency Triage Protocol", modules: 4, lessons: 12 },
  { id: "job_003", fileName: "Maternal_Health_SOP.pdf", status: "processing", createdAt: "2026-02-24 11:00", courseTitle: "Processing...", modules: 0, lessons: 0 },
  { id: "job_004", fileName: "Nutrition_Guidelines.pdf", status: "failed", createdAt: "2026-02-21 16:45", courseTitle: "Failed to parse", modules: 0, lessons: 0 },
];

// ---------------------------------------------------------------------------
// Steps config
// ---------------------------------------------------------------------------

const steps: { step: WizardStep; label: string; icon: React.ElementType }[] = [
  { step: 1, label: "Upload SOP", icon: Upload },
  { step: 2, label: "AI Analysis", icon: Sparkles },
  { step: 3, label: "Review Structure", icon: Eye },
  { step: 4, label: "Edit & Refine", icon: Pencil },
  { step: 5, label: "Publish", icon: Rocket },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  return (
    <nav aria-label="AI Builder steps" className="flex items-center gap-1">
      {steps.map(({ step, label, icon: Icon }, idx) => {
        const isActive = step === currentStep;
        const isComplete = step < currentStep;
        return (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : isComplete
                    ? "text-accent-600"
                    : "text-gray-400"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-brand-500 text-white"
                    : isComplete
                      ? "bg-accent-100 text-accent-700"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className="hidden lg:inline">{label}</span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="mx-1 h-4 w-4 text-gray-300" />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function UploadStep({
  onNext,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  file,
  setFile,
}: {
  onNext: () => void;
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  file: File | null;
  setFile: (f: File | null) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Upload SOP Document</h2>
        <p className="mt-2 text-sm text-gray-500">
          Upload a medical Standard Operating Procedure to generate a structured course automatically.
        </p>
      </div>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          dragOver
            ? "border-brand-400 bg-brand-50"
            : file
              ? "border-accent-300 bg-accent-50/50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      >
        {file ? (
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-accent-500" />
            <p className="mt-3 text-sm font-semibold text-gray-900">{file.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={() => setFile(null)}
              className="mt-2 text-xs text-red-500 hover:text-red-700"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">
              Drag & drop your SOP document here
            </p>
            <p className="mt-1 text-xs text-gray-400">
              PDF, DOCX, or TXT up to 50MB
            </p>
            <label className="mt-4 inline-block">
              <Button variant="outline" size="sm" asChild>
                <span>Choose File</span>
              </Button>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ai-language" className="mb-1.5 block text-sm font-medium text-gray-700">
            Source Language
          </label>
          <select
            id="ai-language"
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <option value="en">English</option>
            <option value="ko">Korean</option>
            <option value="fr">French</option>
          </select>
        </div>
        <div>
          <label htmlFor="ai-specialty" className="mb-1.5 block text-sm font-medium text-gray-700">
            Medical Specialty
          </label>
          <select
            id="ai-specialty"
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <option value="">Auto-detect</option>
            <option value="emergency">Emergency Medicine</option>
            <option value="pediatrics">Pediatrics</option>
            <option value="infectious">Infectious Disease</option>
            <option value="obstetrics">Obstetrics</option>
            <option value="nursing">General Nursing</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!file}>
          Start AI Analysis
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AnalysisStep({ onNext }: { onNext: () => void }) {
  const [progress, setProgress] = useState(0);
  const processingSteps = [
    { label: "Parsing document structure", threshold: 15 },
    { label: "Extracting medical concepts", threshold: 35 },
    { label: "Identifying learning objectives", threshold: 55 },
    { label: "Generating module structure", threshold: 75 },
    { label: "Creating lesson content", threshold: 90 },
    { label: "Finalizing course", threshold: 100 },
  ];

  useState(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  });

  const currentProcessStep = processingSteps.findIndex((s) => progress < s.threshold);
  const activeStepIdx = currentProcessStep === -1 ? processingSteps.length - 1 : currentProcessStep;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-100 opacity-50" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
            <Sparkles className="h-8 w-8 text-brand-600" />
          </div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-gray-900">AI is analyzing your SOP</h2>
        <p className="mt-2 text-sm text-gray-500">
          Claude is extracting medical knowledge and generating course structure
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {processingSteps[activeStepIdx]?.label}
          </span>
          <span className="text-sm font-bold text-brand-600">{Math.min(progress, 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {processingSteps.map((step, idx) => {
          const isComplete = progress >= step.threshold;
          const isActive = idx === activeStepIdx && !isComplete;
          return (
            <div key={step.label} className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 text-accent-500" />
              ) : isActive ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
              )}
              <span
                className={`text-sm ${
                  isComplete
                    ? "font-medium text-gray-900"
                    : isActive
                      ? "font-medium text-brand-700"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {progress >= 100 && (
        <div className="flex justify-center">
          <Button onClick={onNext}>
            Review Generated Structure
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewStep({
  course,
  onNext,
  onBack,
}: {
  course: GeneratedCourse;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Review Generated Course</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review the AI-generated structure. You can edit details in the next step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{course.title}</CardTitle>
          <CardDescription>{course.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">
              {course.specialty}
            </span>
            <span className="text-gray-500">
              {course.modules.length} modules &middot;{" "}
              {course.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {course.modules.map((mod, modIdx) => (
          <Card key={mod.id}>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {modIdx + 1}
                </span>
                <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                <span className="ml-auto text-xs text-gray-400">
                  {mod.lessons.length} lessons
                </span>
              </div>
              <div className="ml-8 space-y-1">
                {mod.lessons.map((lesson) => {
                  const icons = { text: FileText, video: Video, quiz: HelpCircle };
                  const Icon = icons[lesson.contentType];
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600"
                    >
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                      <span>{lesson.title}</span>
                      <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        {lesson.contentType}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Re-analyze
        </Button>
        <Button onClick={onNext}>
          Edit & Refine
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EditStep({
  course,
  onNext,
  onBack,
}: {
  course: GeneratedCourse;
  onNext: () => void;
  onBack: () => void;
}) {
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);

  const currentModule = course.modules[selectedModuleIdx];
  const currentLesson = currentModule?.lessons[selectedLessonIdx];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit & Refine</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and edit each lesson generated by AI
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate All
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar: module/lesson nav */}
        <div className="w-64 shrink-0 space-y-2">
          {course.modules.map((mod, modIdx) => (
            <div key={mod.id}>
              <button
                onClick={() => {
                  setSelectedModuleIdx(modIdx);
                  setSelectedLessonIdx(0);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                  selectedModuleIdx === modIdx
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-xs font-bold text-gray-400">M{modIdx + 1}</span>
                <span className="truncate">{mod.title}</span>
              </button>
              {selectedModuleIdx === modIdx && (
                <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-100 pl-3">
                  {mod.lessons.map((lesson, lesIdx) => (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonIdx(lesIdx)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        selectedLessonIdx === lesIdx
                          ? "bg-brand-50 font-medium text-brand-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{lesson.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Editor */}
        <Card className="flex-1">
          <CardContent className="p-6">
            {currentLesson ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    AI Generated
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {currentLesson.contentType}
                  </span>
                </div>
                <div>
                  <label htmlFor="edit-lesson-title" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Lesson Title
                  </label>
                  <Input id="edit-lesson-title" defaultValue={currentLesson.title} />
                </div>
                <div>
                  <label htmlFor="edit-lesson-summary" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Summary
                  </label>
                  <Input id="edit-lesson-summary" defaultValue={currentLesson.summary} />
                </div>
                {currentLesson.contentType === "text" && (
                  <div>
                    <label htmlFor="edit-lesson-content" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Content
                    </label>
                    <textarea
                      id="edit-lesson-content"
                      defaultValue={currentLesson.content}
                      rows={10}
                      className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    />
                  </div>
                )}
                {currentLesson.contentType === "video" && (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <Video className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      Upload a video for this lesson after publishing
                    </p>
                  </div>
                )}
                {currentLesson.contentType === "quiz" && (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <HelpCircle className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      Quiz questions will be generated. Edit them in the full course editor.
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Regenerate Lesson
                  </Button>
                  <Button size="sm">
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Approve Lesson
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a lesson to edit</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Review
        </Button>
        <Button onClick={onNext}>
          Proceed to Publish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PublishStep({
  course,
  onBack,
}: {
  course: GeneratedCourse;
  onBack: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      setPublished(true);
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">
          {published ? "Course Published!" : "Ready to Publish"}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {published
            ? "Your AI-generated course is now available for review."
            : "Review the summary below and publish when ready."}
        </p>
      </div>

      {published ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-50">
              <CheckCircle2 className="h-8 w-8 text-accent-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{course.title}</h3>
            <p className="mt-2 text-sm text-gray-500">
              The course has been submitted for content review based on its risk level.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" asChild>
                <a href="/admin/courses">View All Courses</a>
              </Button>
              <Button asChild>
                <a href="/admin/courses/new/edit">Open in Editor</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Title</dt>
                  <dd className="text-sm font-medium text-gray-900">{course.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Specialty</dt>
                  <dd className="text-sm font-medium text-gray-900">{course.specialty}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Modules</dt>
                  <dd className="text-sm font-medium text-gray-900">{course.modules.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Total Lessons</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {course.modules.reduce((a, m) => a + m.lessons.length, 0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Source</dt>
                  <dd className="flex items-center gap-1 text-sm font-medium text-brand-600">
                    <Sparkles className="h-3.5 w-3.5" /> AI Generated
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  AI-generated content requires human review
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Per MEDICHIPS-LINK policy, all AI-generated medical content must be reviewed and
                  approved by qualified medical professionals before being made available to learners.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Edit
            </Button>
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Publish Course
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function JobHistory({ jobs }: { jobs: JobHistoryItem[] }) {
  const statusConfig = {
    completed: { label: "Completed", className: "bg-accent-50 text-accent-700" },
    processing: { label: "Processing", className: "bg-brand-50 text-brand-700" },
    failed: { label: "Failed", className: "bg-red-50 text-red-700" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Job History</CardTitle>
        <CardDescription>Previous AI course generation jobs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  File
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  Generated Course
                </th>
                <th className="hidden px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                  Structure
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{job.fileName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusConfig[job.status].className
                      }`}
                    >
                      {job.status === "processing" && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      {statusConfig[job.status].label}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-sm text-gray-600 md:table-cell">
                    {job.courseTitle}
                  </td>
                  <td className="hidden px-3 py-2.5 text-sm text-gray-500 lg:table-cell">
                    {job.status === "completed"
                      ? `${job.modules} modules, ${job.lessons} lessons`
                      : "--"}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">{job.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AIBuilderPage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Course Builder</h1>
        <p className="mt-1 text-sm text-gray-500">
          Transform medical SOPs into structured courses using Claude AI
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <UploadStep
            onNext={() => setCurrentStep(2)}
            dragOver={dragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            file={file}
            setFile={setFile}
          />
        )}
        {currentStep === 2 && <AnalysisStep onNext={() => setCurrentStep(3)} />}
        {currentStep === 3 && (
          <ReviewStep
            course={mockGenerated}
            onNext={() => setCurrentStep(4)}
            onBack={() => setCurrentStep(1)}
          />
        )}
        {currentStep === 4 && (
          <EditStep
            course={mockGenerated}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
          />
        )}
        {currentStep === 5 && (
          <PublishStep course={mockGenerated} onBack={() => setCurrentStep(4)} />
        )}
      </div>

      {/* Job History */}
      <JobHistory jobs={mockJobHistory} />
    </div>
  );
}
