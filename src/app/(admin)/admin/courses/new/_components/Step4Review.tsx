"use client";

import { useState } from "react";
import { Check, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import type { CourseBasicInfo } from "./Step1BasicInfo";
import type { ModuleDraft } from "./Step2Structure";

interface Step4Props {
  basicInfo: CourseBasicInfo;
  modules: ModuleDraft[];
  contents: Record<string, { body: string; quizQuestions: { id: string }[] }>;
  onPrev: () => void;
  onGoToStep: (step: number) => void;
  onSaveDraft: () => Promise<void>;
  onSubmitForReview: () => Promise<void>;
}

const RISK_LABELS: Record<string, string> = {
  L1: "L1 일반 교육",
  L2: "L2 전문 의료",
  L3: "L3 고위험 임상",
};

const LANG_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "English",
  fr: "Français",
  sw: "Kiswahili",
  am: "አማርኛ",
};

export default function Step4Review({
  basicInfo,
  modules,
  contents,
  onPrev,
  onGoToStep,
  onSaveDraft,
  onSubmitForReview,
}: Step4Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;

  // Completeness checks
  const textLessons = allLessons.filter((l) => l.contentType === "TEXT" || l.contentType === "MISSION");
  const videoLessons = allLessons.filter((l) => l.contentType === "VIDEO");
  const quizLessons = allLessons.filter((l) => l.contentType === "QUIZ");
  const aiLessons = allLessons.filter((l) => l.isAiGenerated);

  const completedText = textLessons.filter((l) => contents[l.id]?.body?.trim()).length;
  const completedQuiz = quizLessons.filter((l) => (contents[l.id]?.quizQuestions?.length ?? 0) > 0).length;

  const checks = [
    { ok: basicInfo.title.trim().length > 0, label: "코스 기본 정보 입력 완료" },
    { ok: modules.length > 0, label: `모듈 구조 설정 완료`, detail: `(${modules.length}개 모듈)` },
    {
      ok: completedText === textLessons.length && textLessons.length > 0,
      label: "텍스트 레슨 콘텐츠 작성",
      detail: `(${completedText}/${textLessons.length})`,
    },
    {
      ok: completedQuiz === quizLessons.length && quizLessons.length > 0,
      label: "퀴즈 문제 출제 완료",
      detail: `(${completedQuiz}/${quizLessons.length})`,
    },
  ];

  const warnings = [];
  if (videoLessons.length > 0) {
    warnings.push(`비디오 레슨 ${videoLessons.length}개 미생성 — 발행 후에도 추가 가능`);
  }
  if (aiLessons.length > 0) {
    warnings.push(`AI 생성 콘텐츠 ${aiLessons.length}개 — 전문가 검토 권장`);
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmitForReview();
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-3 py-12 text-center sm:px-6 sm:py-20">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">검토 요청이 제출되었습니다!</h3>
        <p className="mt-2 text-sm text-gray-500">
          &ldquo;{basicInfo.title}&rdquo; 코스가 검토 대기 상태입니다.
          <br />
          의료 전문가의 검토 후 발행됩니다.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => onGoToStep(-1)}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50"
          >
            코스 목록 보기
          </button>
          <button
            onClick={() => onGoToStep(3)}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            에디터에서 열기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-5 sm:px-6 sm:py-8">
      {/* Course Summary */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">코스 요약</h2>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-emerald-400 text-[10px] font-medium text-white sm:h-[72px] sm:w-28">
            {basicInfo.title.slice(0, 10)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{basicInfo.title}</h3>
            {basicInfo.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{basicInfo.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2 py-0.5">모듈 {modules.length}개</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">레슨 {totalLessons}개</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                {RISK_LABELS[basicInfo.riskLevel]}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">
                {LANG_LABELS[basicInfo.language] || basicInfo.language}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">완성도 체크리스트</h3>
        <div className="space-y-3">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                  check.ok ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                {check.ok ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-300" />
                )}
              </div>
              <span className="text-sm text-gray-700">
                {check.label}{" "}
                {check.detail && <span className="text-gray-400">{check.detail}</span>}
              </span>
            </div>
          ))}
          {warnings.map((w, i) => (
            <div key={`w-${i}`} className="flex items-center gap-3">
              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-sm text-gray-700">{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Content Review */}
      {aiLessons.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-gray-900">AI 생성 콘텐츠 (전문가 검토 필요)</h3>
          </div>
          <div className="space-y-2">
            {aiLessons.map((lesson) => {
              const mod = modules.find((m) => m.lessons.some((l) => l.id === lesson.id));
              const modIdx = modules.indexOf(mod!);
              const lesIdx = mod!.lessons.indexOf(lesson);
              return (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">
                      AI
                    </span>
                    <span className="text-sm text-gray-700">
                      M{modIdx + 1} &gt; L{lesIdx + 1} {lesson.title}
                    </span>
                  </div>
                  <button
                    onClick={() => onGoToStep(3)}
                    className="text-xs font-medium text-brand-600 transition hover:text-brand-700"
                  >
                    검토하기 →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onPrev}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 sm:order-1"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          이전
        </button>
        <div className="flex flex-col gap-2 sm:order-2 sm:flex-row sm:items-center sm:gap-3">
          <button
            onClick={onSaveDraft}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            초안 저장
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            검토 요청 제출
          </button>
        </div>
      </div>
    </div>
  );
}
