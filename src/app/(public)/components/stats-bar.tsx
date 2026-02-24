"use client";

import { BookOpen, Globe2, WifiOff, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function StatsBar() {
  const t = useTranslations("landing");

  const stats = [
    {
      icon: BookOpen,
      value: "10+",
      label: t("statSpecialties"),
      color: "text-brand-500",
    },
    {
      icon: Globe2,
      value: "130+",
      label: t("statLanguages"),
      color: "text-accent-500",
    },
    {
      icon: WifiOff,
      value: "100%",
      label: t("statOffline"),
      color: "text-healthcare-amber",
    },
    {
      icon: Sparkles,
      value: "AI",
      label: t("statAi"),
      color: "text-healthcare-purple",
    },
  ];

  return (
    <section className="border-y border-gray-100 bg-gray-50/50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
              <span className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1 text-sm text-gray-600">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
