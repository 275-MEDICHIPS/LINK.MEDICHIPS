"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Trash2, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ModuleDraft, LessonDraft } from "./Step2Structure";

const CONTENT_ICONS: Record<string, string> = {
  TEXT: "📖",
  VIDEO: "🎬",
  QUIZ: "📝",
  MISSION: "🎯",
};

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface LessonContent {
  body: string;
  quizQuestions: QuizQuestion[];
}

interface Step3Props {
  modules: ModuleDraft[];
  contents: Record<string, LessonContent>;
  onContentChange: (lessonId: string, content: LessonContent) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step3Content({ modules, contents, onContentChange, onPrev, onNext }: Step3Props) {
  const allLessons = modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleId: m.id }))
  );
  const [selectedId, setSelectedId] = useState(allLessons[0]?.id || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const selectedLesson = allLessons.find((l) => l.id === selectedId);
  const content = contents[selectedId] || { body: "", quizQuestions: [] };

  // Count completed lessons
  const completedCount = allLessons.filter((l) => {
    const c = contents[l.id];
    if (!c) return false;
    if (l.contentType === "QUIZ") return c.quizQuestions.length > 0;
    return c.body.trim().length > 0;
  }).length;

  const progressPercent = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  const isLessonComplete = (lessonId: string, contentType: string) => {
    const c = contents[lessonId];
    if (!c) return false;
    if (contentType === "QUIZ") return c.quizQuestions.length > 0;
    return c.body.trim().length > 0;
  };

  // Auto-save simulation
  const triggerAutoSave = useCallback(() => {
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  }, []);

  const updateContent = (updates: Partial<LessonContent>) => {
    const newContent = { ...content, ...updates };
    onContentChange(selectedId, newContent);
    triggerAutoSave();
  };

  const addQuestion = () => {
    updateContent({
      quizQuestions: [
        ...content.quizQuestions,
        {
          id: `q_${Date.now()}`,
          question: "",
          options: ["", "", "", ""],
          correctIndex: 0,
          explanation: "",
        },
      ],
    });
  };

  const updateQuestion = (qIdx: number, updates: Partial<QuizQuestion>) => {
    const qs = [...content.quizQuestions];
    qs[qIdx] = { ...qs[qIdx], ...updates };
    updateContent({ quizQuestions: qs });
  };

  const deleteQuestion = (qIdx: number) => {
    updateContent({ quizQuestions: content.quizQuestions.filter((_, i) => i !== qIdx) });
  };

  // Get module label for breadcrumb
  const getModuleLabel = (moduleId: string) => {
    const idx = modules.findIndex((m) => m.id === moduleId);
    return `M${idx + 1}`;
  };

  const getLessonLabel = (lesson: typeof allLessons[0]) => {
    const mod = modules.find((m) => m.id === lesson.moduleId);
    const lesIdx = mod?.lessons.findIndex((l) => l.id === lesson.id) ?? 0;
    return `L${lesIdx + 1}`;
  };

  return (
    <div className="flex h-[calc(100vh-130px)]">
      {/* Left Sidebar */}
      <div className="flex w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">모듈 / 레슨</p>
          {modules.map((mod, modIdx) => (
            <div key={mod.id} className="mb-4">
              <p className="mb-1.5 text-xs font-semibold text-brand-600">
                M{modIdx + 1} {mod.title}
              </p>
              <div className="space-y-0.5">
                {mod.lessons.map((lesson) => {
                  const isSelected = selectedId === lesson.id;
                  const isComplete = isLessonComplete(lesson.id, lesson.contentType);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedId(lesson.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                        isSelected
                          ? "bg-brand-50 font-medium text-brand-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                          isComplete
                            ? "bg-brand-100"
                            : "border-2 border-gray-300"
                        }`}
                      >
                        {isComplete && <Check className="h-3 w-3 text-brand-600" />}
                      </span>
                      <span className="truncate">{lesson.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="border-t border-gray-100 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>진행률</span>
            <span>{completedCount}/{allLessons.length} 레슨</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-y-auto">
        {selectedLesson ? (
          <div className="mx-auto max-w-3xl p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs text-gray-400">
                  {getModuleLabel(selectedLesson.moduleId)} &gt; {getLessonLabel(selectedLesson)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-base">{CONTENT_ICONS[selectedLesson.contentType]}</span>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedLesson.title}</h2>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {saveStatus === "saving" && "저장 중..."}
                {saveStatus === "saved" && "✔ 자동저장 완료"}
              </div>
            </div>

            {/* Text Editor */}
            {(selectedLesson.contentType === "TEXT" || selectedLesson.contentType === "VIDEO" || selectedLesson.contentType === "MISSION") && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    본문 <span className="text-xs font-normal text-gray-400">(Markdown 지원)</span>
                  </label>
                  <textarea
                    value={content.body}
                    onChange={(e) => updateContent({ body: e.target.value })}
                    rows={16}
                    placeholder="레슨 콘텐츠를 작성하세요. Markdown 문법을 사용할 수 있습니다."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>

                {/* AI Toolbar */}
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="mr-1 text-xs font-medium text-gray-500">✨ AI:</span>
                  {["내용 생성", "퀴즈 생성", "번역", "요약", "개선"].map((label) => (
                    <button
                      key={label}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Quiz Editor */}
            {selectedLesson.contentType === "QUIZ" && (
              <div>
                {content.quizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600">
                        Q{qIdx + 1}
                      </span>
                      <button
                        onClick={() => deleteQuestion(qIdx)}
                        className="p-1 text-gray-400 transition hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                      placeholder="문제를 입력하세요..."
                      className="mb-4"
                    />

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg p-2 transition ${
                            q.correctIndex === optIdx
                              ? "border border-green-200 bg-green-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => updateQuestion(qIdx, { correctIndex: optIdx })}
                            className="text-green-600"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const opts = [...q.options];
                              opts[optIdx] = e.target.value;
                              updateQuestion(qIdx, { options: opts });
                            }}
                            placeholder={`보기 ${optIdx + 1}`}
                            className="flex-1 border-0 border-b border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-gray-300"
                          />
                          {q.correctIndex === optIdx && (
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                              정답
                            </span>
                          )}
                        </label>
                      ))}
                    </div>

                    <div className="mt-3">
                      <label className="text-xs font-medium text-gray-500">해설 (선택)</label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
                        placeholder="정답 해설을 입력하세요..."
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                  >
                    <Plus className="h-4 w-4" /> 문제 추가
                  </button>
                  <button className="flex items-center gap-1.5 rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-600 transition hover:bg-violet-50">
                    <Sparkles className="h-4 w-4" /> AI로 문제 생성
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            좌측에서 레슨을 선택하세요.
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <button
            onClick={onPrev}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            이전: 구조 설계
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            다음: 검토·발행
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
