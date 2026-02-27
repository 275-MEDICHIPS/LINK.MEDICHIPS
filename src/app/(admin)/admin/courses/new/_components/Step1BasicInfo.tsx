"use client";

import { Upload, ImageIcon, Sparkles, X, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface CourseBasicInfo {
  title: string;
  description: string;
  language: string;
  riskLevel: "L1" | "L2" | "L3";
}

interface Step1Props {
  data: CourseBasicInfo;
  onChange: (updates: Partial<CourseBasicInfo>) => void;
  aiFile: File | null;
  onAiFileChange: (file: File | null) => void;
  onNext: () => void;
}

export default function Step1BasicInfo({ data, onChange, aiFile, onAiFileChange, onNext }: Step1Props) {
  const canProceed = data.title.trim().length > 0;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onAiFileChange(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAiFileChange(file);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Basic Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">코스 기본 정보</h2>
        <p className="mt-1 text-sm text-gray-500">코스의 제목과 기본 설정을 입력하세요.</p>

        <div className="mt-6 space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              코스 제목 <span className="text-red-500">*</span>
            </label>
            <Input
              value={data.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="예: 기본 봉합술 (Basic Suturing Techniques)"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">코스 설명</label>
            <textarea
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              placeholder="이 코스에서 다루는 내용을 간략히 설명하세요..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>

          {/* Language + Risk */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">주 언어</label>
              <select
                value={data.language}
                onChange={(e) => onChange({ language: e.target.value })}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="sw">Kiswahili</option>
                <option value="am">አማርኛ</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">리스크 레벨</label>
              <select
                value={data.riskLevel}
                onChange={(e) => onChange({ riskLevel: e.target.value as CourseBasicInfo["riskLevel"] })}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="L1">L1 — 일반 교육</option>
                <option value="L2">L2 — 전문 의료</option>
                <option value="L3">L3 — 고위험 임상</option>
              </select>
            </div>
          </div>

          {/* Thumbnail placeholder */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">썸네일</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-emerald-400 text-xs font-medium text-white">
                미리보기
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                  <Upload className="mr-1 inline h-3 w-3" />
                  업로드
                </button>
                <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                  <ImageIcon className="mr-1 inline h-3 w-3" />
                  갤러리
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Builder CTA */}
      <div className="mt-6 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100">
            <Sparkles className="h-5 w-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">AI로 자동 생성하기</h3>
            <p className="mt-1 text-sm text-gray-600">
              SOP 문서를 업로드하면 AI가 코스 구조와 콘텐츠를 자동으로 설계합니다.
            </p>

            {!aiFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="mt-4 cursor-pointer rounded-lg border-2 border-dashed border-brand-300 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/50"
                onClick={() => document.getElementById("ai-file-input")?.click()}
              >
                <FileText className="mx-auto h-8 w-8 text-brand-400" />
                <p className="mt-2 text-sm text-gray-600">PDF, DOCX, TXT 파일을 끌어다 놓으세요</p>
                <p className="mt-1 text-xs text-gray-400">또는 클릭하여 파일 선택 (최대 50MB)</p>
                <input
                  id="ai-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-brand-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-medium text-gray-700">{aiFile.name}</span>
                  <span className="text-xs text-gray-400">
                    {(aiFile.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <button
                  onClick={() => onAiFileChange(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          다음: 구조 설계
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
