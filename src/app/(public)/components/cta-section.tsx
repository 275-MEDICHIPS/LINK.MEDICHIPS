"use client";

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export function CtaSection() {
  const t = useTranslations("landing");

  return (
    <section id="contact" className="scroll-mt-20 bg-gradient-to-br from-brand-600 via-brand-500 to-accent-600 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            {t("ctaSubtitle")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-brand-600 shadow-lg transition-all hover:bg-brand-50 hover:-translate-y-0.5"
            >
              {t("requestTrial")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:contact@medichips.ai"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              <Mail className="h-4 w-4" />
              {t("contactUs")}
            </a>
          </div>

          <p className="mt-8 text-sm text-brand-200">
            {t("ctaNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
