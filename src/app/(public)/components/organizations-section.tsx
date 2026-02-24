"use client";

import { Building2, BarChart3, Globe2, DollarSign } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function OrganizationsSection() {
  const t = useTranslations("landing");

  const orgFeatures = [
    {
      icon: Building2,
      title: t("orgProgramTitle"),
      description: t("orgProgramDesc"),
    },
    {
      icon: BarChart3,
      title: t("orgReportingTitle"),
      description: t("orgReportingDesc"),
    },
    {
      icon: DollarSign,
      title: t("orgCostTitle"),
      description: t("orgCostDesc"),
    },
    {
      icon: Globe2,
      title: t("orgMultiTitle"),
      description: t("orgMultiDesc"),
    },
  ];

  return (
    <section className="bg-gray-50/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
              {t("orgTag")}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
              {t("orgTitle")}
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              {t("orgSubtitle")}
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {orgFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    <feature.icon className="h-5 w-5 text-brand-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="#contact"
              className="mt-8 inline-flex items-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              {t("orgContactBtn")}
            </Link>
          </div>

          {/* Dashboard preview placeholder */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="space-y-4">
              <div className="h-8 rounded bg-gray-100" />
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-brand-50 p-4 text-center">
                  <p className="text-2xl font-bold text-brand-600">2,847</p>
                  <p className="text-xs text-gray-600">{t("orgWorkersTrained")}</p>
                </div>
                <div className="rounded-lg bg-accent-50 p-4 text-center">
                  <p className="text-2xl font-bold text-accent-600">87%</p>
                  <p className="text-xs text-gray-600">{t("orgCompetencyRate")}</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">$42</p>
                  <p className="text-xs text-gray-600">{t("orgCostPerWorker")}</p>
                </div>
              </div>
              <div className="h-32 rounded-lg bg-gradient-to-r from-brand-50 to-accent-50" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 rounded bg-gray-50" />
                <div className="h-20 rounded bg-gray-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
