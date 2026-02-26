"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  const t = useTranslations("landing");

  return (
    <header className="fixed top-0 z-50 w-full bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="MEDICHIPS" width={36} height={36} className="h-9 w-9" />
          <span className="text-lg font-bold text-gray-900">
            MEDICHIPS<span className="text-brand-500">-LINK</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <Link
            href="/login"
            className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30 hover:-translate-y-px"
          >
            시작하기
          </Link>
        </div>
      </div>
    </header>
  );
}
