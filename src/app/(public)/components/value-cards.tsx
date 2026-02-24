"use client";

import { useTranslations } from "next-intl";
import { Smartphone, WifiOff, Sparkles } from "lucide-react";

const VALUE_IDS = [1, 2, 3] as const;

const VALUE_ICONS = [Smartphone, WifiOff, Sparkles] as const;

const VALUE_GRADIENTS = [
  "from-brand-500 to-brand-600",
  "from-brand-600 to-accent-500",
  "from-healthcare-purple to-purple-700",
] as const;

export function ValueCards() {
  const t = useTranslations("landing");

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {t("whyTag")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("whyTitle")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("whySubtitle")}
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {VALUE_IDS.map((id, i) => {
            const Icon = VALUE_ICONS[i];
            const gradient = VALUE_GRADIENTS[i];
            const features = [
              t(`value${id}F1`),
              t(`value${id}F2`),
              t(`value${id}F3`),
            ];

            return (
              <div
                key={id}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:border-brand-200 hover:shadow-brand-500/5"
              >
                {/* Top gradient bar */}
                <div
                  className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${gradient}`}
                />

                <div
                  className={`inline-flex rounded-xl bg-gradient-to-r ${gradient} p-3`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-gray-900">
                  {t(`value${id}Title`)}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {t(`value${id}Desc`)}
                </p>

                <ul className="mt-6 space-y-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg
                        className="h-4 w-4 shrink-0 text-accent-500"
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
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
