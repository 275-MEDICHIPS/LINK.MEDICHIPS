"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  courseCount: number;
}

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

  return (
    <div className="mx-auto max-w-md">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
          관심 분야
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-gray-400">
          맞춤 코스를 추천받으세요
        </p>
      </div>

      {/* Specialties */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {specialties.map((s) => {
            const isSelected = selected === s.id;

            return (
              <button
                key={s.id}
                onClick={() => setSelected(isSelected ? null : s.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors",
                  isSelected
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span className="text-[14px] font-medium">{s.name}</span>
                {s.courseCount > 0 && (
                  <span className={cn(
                    "text-[12px] tabular-nums",
                    isSelected ? "text-gray-400" : "text-gray-300"
                  )}>
                    {s.courseCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="mt-10 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className={cn(
            "w-full rounded-xl py-3.5 text-[14px] font-semibold transition-all",
            selected
              ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.99]"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          )}
        >
          {submitting ? "..." : "시작하기"}
        </button>
        <button
          onClick={() => { window.location.href = "/dashboard"; }}
          className="w-full py-2 text-[13px] text-gray-300 transition-colors hover:text-gray-500"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );
}
