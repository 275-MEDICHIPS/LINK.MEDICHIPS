"use client";

import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "기본정보" },
  { num: 2, label: "구조 설계" },
  { num: 3, label: "콘텐츠 작성" },
  { num: 4, label: "검토·발행" },
] as const;

interface StepIndicatorProps {
  current: number;
  onStepClick?: (step: number) => void;
}

export default function StepIndicator({ current, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => {
        const isCompleted = step.num < current;
        const isCurrent = step.num === current;
        const canClick = step.num <= current && onStepClick;

        return (
          <div key={step.num} className="flex items-center">
            {/* Step circle + label */}
            <button
              onClick={() => canClick && onStepClick(step.num)}
              disabled={!canClick}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isCompleted || isCurrent
                    ? "bg-brand-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <span
                className={`text-sm font-medium ${
                  isCurrent
                    ? "text-brand-700"
                    : isCompleted
                    ? "text-brand-600"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div className="mx-3 h-[3px] w-16 rounded-full bg-gray-200 lg:w-24">
                <div
                  className="h-[3px] rounded-full bg-brand-500 transition-all duration-500"
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
