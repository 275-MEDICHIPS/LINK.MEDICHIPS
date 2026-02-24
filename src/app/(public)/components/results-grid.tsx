"use client";

import { useTranslations } from "next-intl";

const RESULT_IDS = [1, 2, 3, 4, 5, 6] as const;

const RESULT_COLORS = [
  "from-brand-500 to-brand-600",
  "from-accent-500 to-accent-600",
  "from-healthcare-purple to-purple-700",
  "from-healthcare-amber to-amber-600",
  "from-pink-500 to-rose-600",
  "from-teal-500 to-teal-600",
] as const;

// Results 3, 4, and 6 have no suffix
const RESULTS_WITH_SUFFIX = new Set([1, 2, 5]);

export function ResultsGrid() {
  const t = useTranslations("landing");

  return (
    <section id="impact" className="scroll-mt-20 bg-gradient-to-b from-brand-50/40 to-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {t("impactTag")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("impactTitle")}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t("impactSubtitle")}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RESULT_IDS.map((id, i) => {
            const hasSuffix = RESULTS_WITH_SUFFIX.has(id);
            return (
              <div
                key={id}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-brand-200"
              >
                <div
                  className={`inline-flex items-baseline gap-1 bg-gradient-to-r ${RESULT_COLORS[i]} bg-clip-text text-transparent`}
                >
                  <span className="text-4xl font-bold">
                    {t(`result${id}Metric`)}
                  </span>
                  {hasSuffix && (
                    <span className="text-lg font-semibold">
                      {t(`result${id}Suffix`)}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {t(`result${id}Desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
