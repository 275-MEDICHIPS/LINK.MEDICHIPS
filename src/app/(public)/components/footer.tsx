"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("landing");

  const footerLinks = [
    {
      category: t("footerPlatform"),
      links: [
        { label: t("footerMicrolearning"), href: "#features" },
        { label: t("footerPracticeTasks"), href: "#features" },
        { label: t("footerVerification"), href: "#features" },
        { label: t("footerAiCourseBuilder"), href: "#features" },
        { label: t("footerOfflineLearning"), href: "#features" },
      ],
    },
    {
      category: t("footerSolutions"),
      links: [
        { label: t("footerKoica"), href: "#contact" },
        { label: t("footerHospital"), href: "#contact" },
        { label: t("footerNgo"), href: "#contact" },
        { label: t("footerCommunity"), href: "#contact" },
      ],
    },
    {
      category: t("footerResources"),
      links: [
        { label: t("footerDocs"), href: "#" },
        { label: t("footerApi"), href: "#" },
        { label: t("footerBlog"), href: "#" },
        { label: t("footerCaseStudies"), href: "#" },
      ],
    },
    {
      category: t("footerCompany"),
      links: [
        { label: t("footerAbout"), href: "#" },
        { label: t("footerContact"), href: "#contact" },
        { label: t("footerCareers"), href: "#" },
        { label: t("footerPrivacy"), href: "#" },
        { label: t("footerTerms"), href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-brand-100/50 bg-gradient-to-b from-white to-brand-50/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="MEDICHIPS" width={32} height={32} className="h-8 w-8" />
              <span className="text-lg font-bold text-gray-900">
                MEDICHIPS<span className="text-brand-500">-LINK</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              {t("footerDesc")}
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-gray-900">
                {group.category}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-500 transition-colors hover:text-brand-500"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} MEDICHIPS. {t("footerRights")}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>link.medichips.ai</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
