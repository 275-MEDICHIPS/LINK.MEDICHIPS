"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/language-selector";

export function Header() {
  const t = useTranslations("landing");

  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="MEDICHIPS" width={36} height={36} className="h-9 w-9" />
          <span className="text-lg font-bold text-gray-900">
            MEDICHIPS<span className="text-brand-500">-LINK</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            {t("navLogin") ?? "로그인"}
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/20 transition-all hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/30"
          >
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
