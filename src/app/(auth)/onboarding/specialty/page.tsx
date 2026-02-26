"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  courseCount: number;
}

const SPECIALTY_ICONS: Record<string, string> = {
  "내과": "🏥",
  "외과": "🔪",
  "응급의학": "🚑",
  "간호": "💉",
  "치위생": "🦷",
  "물리치료": "🦿",
  "임상병리": "🔬",
  "방사선": "📡",
  "약학": "💊",
  "한의학": "🌿",
  "정형외과": "🦴",
  "소아과": "👶",
  "산부인과": "🤰",
  "피부과": "🧴",
  "안과": "👁️",
  "이비인후과": "👂",
  "마취통증의학": "😴",
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

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="text-center">
        <Image
          src="/logo.png"
          alt="MEDICHIPS"
          width={56}
          height={56}
          className="mx-auto h-14 w-14"
        />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          관심 분야를 선택하세요
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          맞춤 코스를 추천해드립니다
        </p>
      </div>

      {/* Specialties Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {specialties.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(selected === s.id ? null : s.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 transition-all",
                selected === s.id
                  ? "border-brand-500 bg-brand-50 shadow-sm"
                  : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
              )}
            >
              <span className="text-2xl">
                {SPECIALTY_ICONS[s.name] ?? "📋"}
              </span>
              <span className="text-xs font-semibold text-gray-900">
                {s.name}
              </span>
              <span className="text-[10px] text-gray-400">
                코스 {s.courseCount}개
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full rounded-lg bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {submitting ? "저장 중..." : "시작하기"}
        </button>
        <button
          onClick={handleSkip}
          className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
