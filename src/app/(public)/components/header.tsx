"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSelector } from "@/components/language-selector";

const navKeys = ["navFeatures", "navHowItWorks", "navImpact", "navPartners", "navContact"] as const;
const navHrefs = ["#features", "#how-it-works", "#impact", "#partners", "#contact"];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
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

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navKeys.map((key, i) => (
            <a
              key={key}
              href={navHrefs[i]}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-500"
            >
              {t(key)}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link
            href="/login"
            className="hidden rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-500/20 transition-all hover:shadow-md hover:shadow-brand-500/30 sm:inline-flex"
          >
            {t("getStarted")}
          </Link>

          {/* Mobile toggle */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <nav className="flex flex-col px-4 py-4">
            {navKeys.map((key, i) => (
              <a
                key={key}
                href={navHrefs[i]}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileOpen(false)}
              >
                {t(key)}
              </a>
            ))}
            <Link
              href="/login"
              className="mt-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-center text-sm font-medium text-white"
              onClick={() => setMobileOpen(false)}
            >
              {t("getStarted")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
