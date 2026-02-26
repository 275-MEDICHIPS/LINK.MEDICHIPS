"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Check, ArrowRight, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  courseCount: number;
}

const SPECIALTY_META: Record<string, { icon: string; gradient: string }> = {
  "내과":       { icon: "🫀", gradient: "from-rose-500/10 to-orange-500/10" },
  "외과":       { icon: "🔬", gradient: "from-blue-500/10 to-indigo-500/10" },
  "응급의학":   { icon: "🚑", gradient: "from-red-500/10 to-pink-500/10" },
  "간호":       { icon: "💉", gradient: "from-sky-500/10 to-cyan-500/10" },
  "치위생":     { icon: "🦷", gradient: "from-violet-500/10 to-purple-500/10" },
  "물리치료":   { icon: "🦿", gradient: "from-emerald-500/10 to-green-500/10" },
  "임상병리":   { icon: "🧬", gradient: "from-amber-500/10 to-yellow-500/10" },
  "방사선":     { icon: "📡", gradient: "from-slate-500/10 to-gray-500/10" },
  "약학":       { icon: "💊", gradient: "from-teal-500/10 to-emerald-500/10" },
  "한의학":     { icon: "🌿", gradient: "from-lime-500/10 to-green-500/10" },
  "정형외과":   { icon: "🦴", gradient: "from-stone-500/10 to-neutral-500/10" },
  "소아과":     { icon: "👶", gradient: "from-pink-500/10 to-rose-500/10" },
  "산부인과":   { icon: "🤰", gradient: "from-fuchsia-500/10 to-pink-500/10" },
  "피부과":     { icon: "✨", gradient: "from-amber-500/10 to-orange-500/10" },
  "안과":       { icon: "👁️", gradient: "from-cyan-500/10 to-blue-500/10" },
  "이비인후과": { icon: "👂", gradient: "from-indigo-500/10 to-violet-500/10" },
  "마취통증의학": { icon: "😴", gradient: "from-purple-500/10 to-indigo-500/10" },
};

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function SpecialtyOnboardingPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/specialties")
      .then((r) => r.json())
      .then((json) => setSpecialties(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({ specialtyId: selected }),
      });
    } catch {
      // proceed even on error
    }
    window.location.href = "/dashboard";
  }

  function handleSkip() {
    window.location.href = "/dashboard";
  }

  const selectedSpec = specialties.find((s) => s.id === selected);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/20">
          <Stethoscope className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          관심 분야를 선택하세요
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          선택한 분야에 맞는 코스를 우선 추천해드립니다
        </p>
      </div>

      {/* Specialties Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {specialties.map((s) => {
            const meta = SPECIALTY_META[s.name];
            const isSelected = selected === s.id;
            const hasCourses = s.courseCount > 0;

            return (
              <button
                key={s.id}
                onClick={() => setSelected(isSelected ? null : s.id)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 transition-all duration-200",
                  isSelected
                    ? "border-brand-500 bg-brand-50 shadow-md shadow-brand-500/10"
                    : "border-transparent bg-white shadow-sm hover:border-gray-200 hover:shadow-md",
                )}
              >
                {/* Selection check */}
                {isSelected && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 shadow-sm">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}

                {/* Icon */}
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-transform duration-200 group-hover:scale-110",
                  meta?.gradient
                    ? `bg-gradient-to-br ${meta.gradient}`
                    : "bg-gray-50"
                )}>
                  {meta?.icon ?? "📋"}
                </div>

                {/* Name */}
                <span className={cn(
                  "text-xs font-semibold transition-colors",
                  isSelected ? "text-brand-700" : "text-gray-700"
                )}>
                  {s.name}
                </span>

                {/* Course count */}
                {hasCourses && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isSelected
                      ? "bg-brand-100 text-brand-600"
                      : "bg-gray-100 text-gray-400"
                  )}>
                    {s.courseCount}개 코스
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected info */}
      {selectedSpec && (
        <div className="animate-fade-in rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 to-transparent px-4 py-3">
          <p className="text-sm text-brand-800">
            <span className="font-semibold">{selectedSpec.name}</span> 분야의 코스
            {selectedSpec.courseCount > 0
              ? ` ${selectedSpec.courseCount}개가 준비되어 있습니다`
              : "가 곧 추가될 예정입니다"}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200",
            selected
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              시작하기
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <button
          onClick={handleSkip}
          className="w-full py-2 text-center text-sm font-medium text-gray-400 transition-colors hover:text-gray-600"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
