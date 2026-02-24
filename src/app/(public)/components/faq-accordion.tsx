"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How does MEDICHIPS-LINK work without internet?",
    answer:
      "Our PWA (Progressive Web App) uses Service Workers and IndexedDB to cache courses locally. Healthcare workers download courses over WiFi, then learn anywhere — even in areas with zero connectivity. All progress syncs automatically when connection returns, with domain-specific merge strategies to prevent data loss.",
  },
  {
    question: "How is content quality ensured for medical training?",
    answer:
      "We use a risk-based content review workflow. Low-risk content (hygiene education) can be auto-published by instructors. Mid-risk content (triage, basic procedures) requires reviewer and admin approval. High-risk content (surgery, medication) requires multiple expert reviews. AI-generated content always requires human review before publication.",
  },
  {
    question: "Can we use existing training materials?",
    answer:
      "Yes! Our AI Course Builder accepts SOPs, clinical guidelines, and training manuals in any format. It automatically structures them into microlearning modules with quizzes and practice tasks. The AI translates content into 130+ languages with verified medical terminology. All AI-generated content goes through mandatory expert review.",
  },
  {
    question: "How does this compare to traditional in-person training?",
    answer:
      "MEDICHIPS-LINK achieves 1/10th the cost per healthcare worker while reaching 10x more workers with the same budget. The L-D-V-I (Learn-Do-Verify-Improve) cycle ensures knowledge transfers to actual clinical practice, not just test scores. Multi-level verification confirms real-world competency.",
  },
  {
    question: "Does it work on shared devices in clinics?",
    answer:
      "Yes. MEDICHIPS-LINK supports multi-user shared devices. Each worker logs in with their PIN, and their data is isolated in local storage. Downloaded media is shared across users to save storage and bandwidth. The 'Switch User' feature allows quick transitions between shifts.",
  },
  {
    question: "What reporting is available for KOICA and donors?",
    answer:
      "The Impact Dashboard provides real-time metrics: cost per healthcare worker, competency rates by program, completion rates, supervisor verification statistics, and outcome records confirmed by on-site supervisors. All data is exportable for KOICA annual reporting requirements.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-gradient-to-b from-brand-50/20 to-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Frequently Asked Questions
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
