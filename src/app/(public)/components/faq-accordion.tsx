"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

export function FaqAccordion() {
  const t = useTranslations("landing");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { question: t("faq1Q"), answer: t("faq1A") },
    { question: t("faq2Q"), answer: t("faq2A") },
    { question: t("faq3Q"), answer: t("faq3A") },
    { question: t("faq4Q"), answer: t("faq4A") },
    { question: t("faq5Q"), answer: t("faq5A") },
    { question: t("faq6Q"), answer: t("faq6A") },
  ];

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {t("faqTag")}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("faqTitle")}
          </h2>
        </div>

        <div className="mt-12 divide-y divide-gray-200">
          {faqs.map((faq, i) => (
            <div key={faq.question} className="py-5">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-start justify-between text-left"
              >
                <span className="pr-8 text-base font-semibold text-gray-900">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 transition-transform ${
                    openIndex === i ? "rotate-180 text-brand-500" : "text-gray-400"
                  }`}
                />
              </button>
              {openIndex === i && (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
