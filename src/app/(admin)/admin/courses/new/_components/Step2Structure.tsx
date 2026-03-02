"use client";

import { useState } from "react";
import {
  Plus,
  GripVertical,
  ChevronDown,
  MoreVertical,
  Pencil,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export interface LessonDraft {
  id: string;
  title: string;
  contentType: "TEXT" | "VIDEO" | "QUIZ" | "MISSION";
  isAiGenerated?: boolean;
}

export interface ModuleDraft {
  id: string;
  title: string;
  lessons: LessonDraft[];
  isAiGenerated?: boolean;
}

const CONTENT_ICONS: Record<string, string> = {
  TEXT: "📖",
  VIDEO: "🎬",
  QUIZ: "📝",
  MISSION: "🎯",
};

interface Step2Props {
  modules: ModuleDraft[];
  onChange: (modules: ModuleDraft[]) => void;
  hasAiFile: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function Step2Structure({ modules, onChange, hasAiFile, onPrev, onNext }: Step2Props) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<LessonDraft["contentType"]>("TEXT");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "module" | "lesson";
    moduleIdx: number;
    lessonIdx?: number;
  } | null>(null);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addModule = () => {
    if (!newModuleTitle.trim()) return;
    const newMod: ModuleDraft = {
      id: `mod_${Date.now()}`,
      title: newModuleTitle.trim(),
      lessons: [],
    };
    onChange([...modules, newMod]);
    setExpandedModules((prev) => new Set([...prev, newMod.id]));
    setNewModuleTitle("");
    setAddingModule(false);
  };

  const addLesson = (moduleId: string) => {
    if (!newLessonTitle.trim()) return;
    const newLesson: LessonDraft = {
      id: `les_${Date.now()}`,
      title: newLessonTitle.trim(),
      contentType: newLessonType,
    };
    onChange(
      modules.map((m) =>
        m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m
      )
    );
    setNewLessonTitle("");
    setNewLessonType("TEXT");
    setAddingLessonFor(null);
  };

  const deleteModule = (idx: number) => {
    const mod = modules[idx];
    if (!confirm(`"${mod.title}" 모듈과 하위 레슨 ${mod.lessons.length}개가 삭제됩니다. 계속하시겠습니까?`)) return;
    onChange(modules.filter((_, i) => i !== idx));
  };

  const deleteLesson = (modIdx: number, lesIdx: number) => {
    const lesson = modules[modIdx].lessons[lesIdx];
    if (!confirm(`"${lesson.title}" 레슨이 삭제됩니다. 계속하시겠습니까?`)) return;
    onChange(
      modules.map((m, i) =>
        i === modIdx ? { ...m, lessons: m.lessons.filter((_, j) => j !== lesIdx) } : m
      )
    );
  };

  const moveModule = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= modules.length) return;
    const arr = [...modules];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  };

  const moveLesson = (modIdx: number, lesIdx: number, dir: -1 | 1) => {
    const target = lesIdx + dir;
    const mod = modules[modIdx];
    if (target < 0 || target >= mod.lessons.length) return;
    const lessons = [...mod.lessons];
    [lessons[lesIdx], lessons[target]] = [lessons[target], lessons[lesIdx]];
    onChange(modules.map((m, i) => (i === modIdx ? { ...m, lessons } : m)));
  };

  const duplicateModule = (idx: number) => {
    const orig = modules[idx];
    const dup: ModuleDraft = {
      ...orig,
      id: `mod_${Date.now()}`,
      title: `${orig.title} (복사)`,
      lessons: orig.lessons.map((l) => ({ ...l, id: `les_${Date.now()}_${Math.random()}` })),
    };
    const arr = [...modules];
    arr.splice(idx + 1, 0, dup);
    onChange(arr);
  };

  const showContextMenu = (
    e: React.MouseEvent,
    type: "module" | "lesson",
    moduleIdx: number,
    lessonIdx?: number
  ) => {
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, moduleIdx, lessonIdx });
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-8">
      {/* AI Banner */}
      {hasAiFile && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <span className="text-sm">✨</span>
            </div>
            <div>
              <p className="text-sm font-medium text-violet-900">AI가 문서를 분석하여 아래 구조를 제안합니다</p>
              <p className="text-xs text-violet-600">수정하거나 그대로 사용하세요.</p>
            </div>
          </div>
          <button className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100">
            다시 분석하기
          </button>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">코스 구조 설계</h2>
        <p className="mt-0.5 text-sm text-gray-500">모듈과 레슨을 추가하고 순서를 정하세요.</p>
      </div>

      {/* Module Tree */}
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
        {modules.map((mod, modIdx) => (
          <div key={mod.id}>
            {/* Module Header */}
            <div
              className="flex cursor-pointer items-center gap-2 bg-gray-50/80 px-4 py-3"
              onClick={() => toggleModule(mod.id)}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  expandedModules.has(mod.id) ? "" : "-rotate-90"
                }`}
              />
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600">
                M{modIdx + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-900">{mod.title}</span>
              {mod.isAiGenerated && (
                <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">AI</span>
              )}
              <span className="text-xs text-gray-400">{mod.lessons.length} 레슨</span>
              <button
                onClick={(e) => showContextMenu(e, "module", modIdx)}
                className="ml-1 rounded p-1 transition hover:bg-gray-200"
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            {/* Lessons */}
            {expandedModules.has(mod.id) && (
              <div className="divide-y divide-gray-50">
                {mod.lessons.map((lesson, lesIdx) => (
                  <div
                    key={lesson.id}
                    className="group flex items-center gap-2 px-4 py-2.5 pl-8 transition hover:bg-gray-50/50 sm:pl-14"
                  >
                    <GripVertical className="h-4 w-4 text-gray-300 opacity-0 transition group-hover:opacity-100" />
                    <span className="text-base">{CONTENT_ICONS[lesson.contentType]}</span>
                    <span className="flex-1 text-sm text-gray-700">{lesson.title}</span>
                    {lesson.isAiGenerated && (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600">AI</span>
                    )}
                    <span className="text-xs text-gray-400">{lesson.contentType}</span>
                    <button
                      onClick={(e) => showContextMenu(e, "lesson", modIdx, lesIdx)}
                      className="rounded p-1 opacity-0 transition hover:bg-gray-200 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </div>
                ))}

                {/* Add Lesson */}
                <div className="px-4 py-2 pl-8 sm:pl-14">
                  {addingLessonFor === mod.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="레슨 제목"
                        className="h-8 flex-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addLesson(mod.id);
                          if (e.key === "Escape") setAddingLessonFor(null);
                        }}
                      />
                      <select
                        value={newLessonType}
                        onChange={(e) => setNewLessonType(e.target.value as LessonDraft["contentType"])}
                        className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs"
                      >
                        <option value="TEXT">📖 TEXT</option>
                        <option value="VIDEO">🎬 VIDEO</option>
                        <option value="QUIZ">📝 QUIZ</option>
                        <option value="MISSION">🎯 MISSION</option>
                      </select>
                      <button
                        onClick={() => setAddingLessonFor(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => addLesson(mod.id)}
                        disabled={!newLessonTitle.trim()}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        추가
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingLessonFor(mod.id);
                        setNewLessonTitle("");
                      }}
                      className="flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      <Plus className="h-4 w-4" />
                      레슨 추가
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add Module */}
        <div className="px-4 py-3">
          {addingModule ? (
            <div className="flex items-center gap-2">
              <Input
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="모듈 제목"
                className="h-9 flex-1 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addModule();
                  if (e.key === "Escape") setAddingModule(false);
                }}
              />
              <button
                onClick={() => setAddingModule(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={addModule}
                disabled={!newModuleTitle.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
              >
                추가
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingModule(true)}
              className="flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
            >
              <Plus className="h-4 w-4" />
              모듈 추가
            </button>
          )}
        </div>
      </div>

      {/* Hint */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <Info className="h-3.5 w-3.5" />
        ⋮ 메뉴에서 수정, 삭제, 복제, 이동이 가능합니다.
      </div>

      {/* Navigation */}
      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button
          onClick={onPrev}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 sm:order-1"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          이전
        </button>
        <button
          onClick={onNext}
          disabled={modules.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50 sm:order-2"
        >
          다음: 콘텐츠 작성
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === "module" ? (
              <>
                <button
                  onClick={() => {
                    const title = prompt("새 모듈 이름:", modules[contextMenu.moduleIdx].title);
                    if (title) {
                      onChange(modules.map((m, i) => (i === contextMenu.moduleIdx ? { ...m, title } : m)));
                    }
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4 text-gray-400" /> 이름 변경
                </button>
                <button
                  onClick={() => { duplicateModule(contextMenu.moduleIdx); setContextMenu(null); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4 text-gray-400" /> 복제
                </button>
                <button
                  onClick={() => { moveModule(contextMenu.moduleIdx, -1); setContextMenu(null); }}
                  disabled={contextMenu.moduleIdx === 0}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4 text-gray-400" /> 위로 이동
                </button>
                <button
                  onClick={() => { moveModule(contextMenu.moduleIdx, 1); setContextMenu(null); }}
                  disabled={contextMenu.moduleIdx === modules.length - 1}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4 text-gray-400" /> 아래로 이동
                </button>
                <div className="my-1.5 border-t border-gray-100" />
                <button
                  onClick={() => { deleteModule(contextMenu.moduleIdx); setContextMenu(null); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-400" /> 삭제
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    const lesson = modules[contextMenu.moduleIdx].lessons[contextMenu.lessonIdx!];
                    const title = prompt("새 레슨 이름:", lesson.title);
                    if (title) {
                      onChange(
                        modules.map((m, mi) =>
                          mi === contextMenu.moduleIdx
                            ? { ...m, lessons: m.lessons.map((l, li) => (li === contextMenu.lessonIdx ? { ...l, title } : l)) }
                            : m
                        )
                      );
                    }
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4 text-gray-400" /> 이름 변경
                </button>
                <button
                  onClick={() => { moveLesson(contextMenu.moduleIdx, contextMenu.lessonIdx!, -1); setContextMenu(null); }}
                  disabled={contextMenu.lessonIdx === 0}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4 text-gray-400" /> 위로 이동
                </button>
                <button
                  onClick={() => { moveLesson(contextMenu.moduleIdx, contextMenu.lessonIdx!, 1); setContextMenu(null); }}
                  disabled={contextMenu.lessonIdx === modules[contextMenu.moduleIdx].lessons.length - 1}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4 text-gray-400" /> 아래로 이동
                </button>
                <div className="my-1.5 border-t border-gray-100" />
                <button
                  onClick={() => { deleteLesson(contextMenu.moduleIdx, contextMenu.lessonIdx!); setContextMenu(null); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-400" /> 삭제
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
