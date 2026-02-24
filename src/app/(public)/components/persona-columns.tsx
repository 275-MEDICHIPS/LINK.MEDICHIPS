"use client";

import { GraduationCap, Users, Shield } from "lucide-react";
import { useTranslations } from "next-intl";

export function PersonaColumns() {
  const t = useTranslations("landing");

  const personas = [
    {
      icon: GraduationCap,
      role: t("personaLearnerRole"),
      subtitle: t("personaLearnerSubtitle"),
      color: "border-brand-500 bg-brand-50 text-brand-500",
      benefits: [
        t("personaLearnerB1"),
        t("personaLearnerB2"),
        t("personaLearnerB3"),
        t("personaLearnerB4"),
        t("personaLearnerB5"),
        t("personaLearnerB6"),
      ],
      preview: {
        title: t("personaLearnerPreview"),
        items: [
          { label: t("personaLearnerP1Label"), value: t("personaLearnerP1Value") },
          { label: t("personaLearnerP2Label"), value: t("personaLearnerP2Value") },
          { label: t("personaLearnerP3Label"), value: t("personaLearnerP3Value") },
        ],
      },
    },
    {
      icon: Users,
      role: t("personaSuperRole"),
      subtitle: t("personaSuperSubtitle"),
      color: "border-accent-500 bg-accent-50 text-accent-500",
      benefits: [
        t("personaSuperB1"),
        t("personaSuperB2"),
        t("personaSuperB3"),
        t("personaSuperB4"),
        t("personaSuperB5"),
        t("personaSuperB6"),
      ],
      preview: {
        title: t("personaSuperPreview"),
        items: [
          { label: t("personaSuperP1Label"), value: t("personaSuperP1Value") },
          { label: t("personaSuperP2Label"), value: t("personaSuperP2Value") },
          { label: t("personaSuperP3Label"), value: t("personaSuperP3Value") },
        ],
      },
    },
    {
      icon: Shield,
      role: t("personaAdminRole"),
      subtitle: t("personaAdminSubtitle"),
      color: "border-healthcare-purple bg-purple-50 text-healthcare-purple",
      benefits: [
        t("personaAdminB1"),
        t("personaAdminB2"),
        t("personaAdminB3"),
        t("personaAdminB4"),
        t("personaAdminB5"),
        t("personaAdminB6"),
      ],
      preview: {
        title: t("personaAdminPreview"),
        items: [
          { label: t("personaAdminP1Label"), value: t("personaAdminP1Value") },
          { label: t("personaAdminP2Label"), value: t("personaAdminP2Value") },
          { label: t("personaAdminP3Label"), value: t("personaAdminP3Value") },
        ],
      },
    },
  ];

  return (
    <section className="bg-gradient-to-b from-white to-brand-50/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {t("personasTag")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("personasTitle")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("personasSubtitle")}
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {personas.map((persona) => (
            <div
              key={persona.role}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg hover:border-brand-200"
            >
              {/* Header */}
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${persona.color}`}
                  >
                    <persona.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {persona.role}
                    </h3>
                    <p className="text-sm text-gray-500">{persona.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="px-6 py-5">
                <ul className="space-y-3">
                  {persona.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preview card */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {persona.preview.title}
                </p>
                <div className="space-y-2">
                  {persona.preview.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-500">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
