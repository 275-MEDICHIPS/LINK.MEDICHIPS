"use client";

import { useTranslations } from "next-intl";

const partners = [
  "KOICA",
  "Seoul National University Hospital",
  "Yonsei Medical Center",
  "Samsung Medical Center",
  "Asan Medical Center",
  "WHO",
  "JICA",
  "UNICEF",
  "Korea Foundation",
  "Global Health Initiative",
];

export function LogoCarousel() {
  const t = useTranslations("landing");

  return (
    <section className="overflow-hidden border-y border-gray-100 bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-sm font-medium text-gray-500">
          {t("trustedBy")}
        </p>
      </div>

      {/* Infinite scroll carousel */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-white to-transparent" />

        <div className="flex animate-[scroll_30s_linear_infinite] items-center gap-12">
          {[...partners, ...partners].map((partner, i) => (
            <div
              key={`${partner}-${i}`}
              className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 px-6"
            >
              <span className="whitespace-nowrap text-sm font-semibold text-gray-400">
                {partner}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
