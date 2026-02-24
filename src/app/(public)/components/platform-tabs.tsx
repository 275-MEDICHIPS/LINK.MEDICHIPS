"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Hammer,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from "lucide-react";

const TAB_IDS = ["Learn", "Do", "Verify", "Improve", "Ai"] as const;

const TAB_ICONS = {
  Learn: BookOpen,
  Do: Hammer,
  Verify: ShieldCheck,
  Improve: TrendingUp,
  Ai: Sparkles,
} as const;

const AUTO_ROTATE_MS = 8000;

export function PlatformTabs() {
  const t = useTranslations("landing");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % TAB_IDS.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [activeTab]);

  const activeId = TAB_IDS[activeTab];
  const ActiveIcon = TAB_ICONS[activeId];

  const features = [
    t(`tab${activeId}F1`),
    t(`tab${activeId}F2`),
    t(`tab${activeId}F3`),
    t(`tab${activeId}F4`),
  ];

  const stats = [
    { label: t(`tab${activeId}S1Label`), value: t(`tab${activeId}S1Value`) },
    { label: t(`tab${activeId}S2Label`), value: t(`tab${activeId}S2Value`) },
    { label: t(`tab${activeId}S3Label`), value: t(`tab${activeId}S3Value`) },
  ];

  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {t("platformTag")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("platformTitle")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("platformSubtitle")}
          </p>
        </div>

        {/* Tab buttons */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {TAB_IDS.map((id, i) => {
            const Icon = TAB_ICONS[id];
            return (
              <button
                key={id}
                onClick={() => setActiveTab(i)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                  i === activeTab
                    ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30"
                    : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`tab${id}Label`)}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h3 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {t(`tab${activeId}Title`)}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              {t(`tab${activeId}Desc`)}
            </p>
            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100">
                    <svg
                      className="h-3 w-3 text-accent-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preview card */}
          <div className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-lg ring-1 ring-brand-500/10">
              {/* Preview header */}
              <div className="border-b border-brand-100 bg-gradient-to-r from-brand-50 to-white px-6 py-4">
                <div className="flex items-center gap-2">
                  <ActiveIcon className="h-5 w-5 text-brand-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {t(`tab${activeId}Label`)}
                  </span>
                </div>
              </div>

              {/* Preview body */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-2xl font-bold text-brand-600">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Progress bar animation */}
                <div className="mt-6 space-y-3">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-[8000ms] ease-linear"
                      style={{ width: "100%" }}
                      key={activeTab}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{t("moduleProgress")}</span>
                    <span>
                      {activeTab + 1}/{TAB_IDS.length}
                    </span>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="mt-6 space-y-2">
                  {features.slice(0, 3).map((f, i) => (
                    <div
                      key={f}
                      className="flex items-center gap-3 rounded-lg bg-brand-50/50 px-4 py-2.5"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-600">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
