"use client";

import { BookOpen, Hammer, ShieldCheck, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

interface StepKey {
  number: string;
  icon: LucideIcon;
  titleKey: string;
  subtitleKey: string;
  descKey: string;
  color: string;
  accent: string;
}

const stepKeys: StepKey[] = [
  {
    number: "01",
    icon: BookOpen,
    titleKey: "step01Title",
    subtitleKey: "step01Subtitle",
    descKey: "step01Desc",
    color: "border-brand-500 bg-brand-50 text-brand-500",
    accent: "text-brand-500",
  },
  {
    number: "02",
    icon: Hammer,
    titleKey: "step02Title",
    subtitleKey: "step02Subtitle",
    descKey: "step02Desc",
    color: "border-accent-500 bg-accent-50 text-accent-500",
    accent: "text-accent-500",
  },
  {
    number: "03",
    icon: ShieldCheck,
    titleKey: "step03Title",
    subtitleKey: "step03Subtitle",
    descKey: "step03Desc",
    color: "border-healthcare-amber bg-amber-50 text-healthcare-amber",
    accent: "text-healthcare-amber",
  },
  {
    number: "04",
    icon: TrendingUp,
    titleKey: "step04Title",
    subtitleKey: "step04Subtitle",
    descKey: "step04Desc",
    color: "border-healthcare-purple bg-purple-50 text-healthcare-purple",
    accent: "text-healthcare-purple",
  },
];

export function HowItWorks() {
  const t = useTranslations("landing");

  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {t("howItWorksTag")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("howItWorksTitle")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("howItWorksSubtitle")}
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connection line (desktop) */}
          <div className="absolute left-0 right-0 top-24 hidden h-0.5 bg-gradient-to-r from-brand-200 via-accent-200 to-purple-200 lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stepKeys.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div
                  className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${step.color}`}
                >
                  <step.icon className="h-7 w-7" />
                </div>

                {/* Step number */}
                <span
                  className={`mt-4 text-xs font-bold uppercase tracking-widest ${step.accent}`}
                >
                  {t("stepPrefix")} {step.number}
                </span>

                <h3 className="mt-2 text-xl font-bold text-gray-900">
                  {t(step.titleKey)}
                </h3>
                <p className={`text-sm font-medium ${step.accent}`}>
                  {t(step.subtitleKey)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {t(step.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
