"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { csrfHeaders } from "@/lib/utils/csrf";
import StepIndicator from "./_components/StepIndicator";
import Step1BasicInfo, { type CourseBasicInfo } from "./_components/Step1BasicInfo";
import Step2Structure, { type ModuleDraft } from "./_components/Step2Structure";
import Step3Content from "./_components/Step3Content";
import Step4Review from "./_components/Step4Review";

interface LessonContent {
  body: string;
  quizQuestions: { id: string; question: string; options: string[]; correctIndex: number; explanation: string }[];
}

export default function NewCoursePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [basicInfo, setBasicInfo] = useState<CourseBasicInfo>({
    title: "",
    description: "",
    language: "ko",
    riskLevel: "L1",
  });
  const [aiFile, setAiFile] = useState<File | null>(null);

  // Step 2 state
  const [modules, setModules] = useState<ModuleDraft[]>([]);

  // Step 3 state
  const [contents, setContents] = useState<Record<string, LessonContent>>({});

  // Save indicator
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleContentChange = useCallback((lessonId: string, content: LessonContent) => {
    setContents((prev) => ({ ...prev, [lessonId]: content }));
  }, []);

  const goToStep = (step: number) => {
    if (step === -1) {
      router.push("/admin/courses");
      return;
    }
    setCurrentStep(step);
    window.scrollTo(0, 0);
  };

  // Create course in API and then add modules/lessons
  const saveCourseToApi = async (): Promise<string | null> => {
    try {
      // 1. Create course
      const asciiSlug = basicInfo.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      const slug = asciiSlug.length >= 3 ? asciiSlug : `course-${Date.now()}`;

      const courseRes = await fetch("/api/v1/courses", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          slug,
          locale: basicInfo.language,
          title: basicInfo.title.trim(),
          description: basicInfo.description || undefined,
          riskLevel: basicInfo.riskLevel,
        }),
      });

      if (!courseRes.ok) return null;
      const courseJson = await courseRes.json();
      const courseId = courseJson.data?.id;
      if (!courseId) return null;

      // 2. Create modules and lessons sequentially
      for (const mod of modules) {
        const modRes = await fetch(`/api/v1/courses/${courseId}/modules`, {
          method: "POST",
          headers: csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            locale: basicInfo.language,
            title: mod.title,
          }),
        });

        if (!modRes.ok) continue;
        const modJson = await modRes.json();
        const moduleId = modJson.data?.id;
        if (!moduleId) continue;

        for (const lesson of mod.lessons) {
          const lessonContent = contents[lesson.id];
          const body: Record<string, unknown> = {};

          if (lessonContent?.body) {
            body.text = lessonContent.body;
          }
          if (lessonContent?.quizQuestions?.length) {
            body.questions = lessonContent.quizQuestions;
          }

          await fetch(`/api/v1/courses/${courseId}/modules/${moduleId}/lessons`, {
            method: "POST",
            headers: csrfHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              locale: basicInfo.language,
              title: lesson.title,
              contentType: lesson.contentType,
              body,
              isAiGenerated: lesson.isAiGenerated || false,
            }),
          });
        }
      }

      return courseId;
    } catch {
      return null;
    }
  };

  const handleSaveDraft = async () => {
    setSaveStatus("saving");
    const courseId = await saveCourseToApi();
    setSaveStatus(courseId ? "saved" : "idle");
    if (courseId) {
      setTimeout(() => router.push(`/admin/courses/${courseId}/edit`), 1000);
    }
  };

  const handleSubmitForReview = async () => {
    const courseId = await saveCourseToApi();
    if (courseId) {
      // Submit for review
      await fetch(`/api/v1/courses/${courseId}`, {
        method: "PATCH",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ status: "IN_REVIEW" }),
      });
    }
  };

  return (
    <div className="-mx-4 -mt-4 -mb-4 flex min-h-[calc(100vh-3.5rem)] flex-col lg:-mx-6 lg:-mt-6 lg:-mb-6">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin/courses"
              className="flex flex-shrink-0 items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">코스 목록</span>
            </Link>
            <span className="hidden text-gray-300 sm:inline">|</span>
            <span className="truncate font-semibold text-gray-900">
              {basicInfo.title || "새 코스 만들기"}
            </span>
            {currentStep > 1 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                DRAFT
              </span>
            )}
          </div>
          {currentStep === 3 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              {saveStatus === "saving" && "저장 중..."}
              {saveStatus === "saved" && (
                <>
                  <svg className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  자동저장 완료
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-7">
          <StepIndicator current={currentStep} onStepClick={goToStep} />
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {currentStep === 1 && (
          <Step1BasicInfo
            data={basicInfo}
            onChange={(updates) => setBasicInfo((prev) => ({ ...prev, ...updates }))}
            aiFile={aiFile}
            onAiFileChange={setAiFile}
            onNext={() => goToStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2Structure
            modules={modules}
            onChange={setModules}
            hasAiFile={!!aiFile}
            onPrev={() => goToStep(1)}
            onNext={() => goToStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3Content
            modules={modules}
            contents={contents}
            onContentChange={handleContentChange}
            onPrev={() => goToStep(2)}
            onNext={() => goToStep(4)}
          />
        )}

        {currentStep === 4 && (
          <Step4Review
            basicInfo={basicInfo}
            modules={modules}
            contents={contents}
            onPrev={() => goToStep(3)}
            onGoToStep={goToStep}
            onSaveDraft={handleSaveDraft}
            onSubmitForReview={handleSubmitForReview}
          />
        )}
      </div>
    </div>
  );
}
