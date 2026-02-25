"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Trophy,
  BarChart3,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Toaster } from "@/components/ui/toaster";

const tabKeys = [
  { href: "/dashboard", icon: LayoutDashboard, key: "home" as const },
  { href: "/courses", icon: BookOpen, key: "courses" as const },
  { href: "/tasks", icon: ClipboardCheck, key: "tasks" as const },
  { href: "/achievements", icon: Trophy, key: "awards" as const },
  { href: "/leaderboard", icon: BarChart3, key: "rank" as const },
];

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ORG_ADMIN" || user?.role === "INSTRUCTOR";

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" data-logo-bounce />
              <span className="text-sm font-bold text-gray-900">LINK</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
              >
                <Settings className="h-3 w-3" />
                관리
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Offline indicator placeholder */}
            <div className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
              {tc("online")}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-4">{children}</main>
      <Toaster />

      {/* Bottom tab bar */}
      <nav className="sticky bottom-0 z-40 border-t border-gray-100 bg-white pb-safe">
        <div className="flex items-center justify-around py-2">
          {tabKeys.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 transition-colors hover:text-brand-500"
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{t(tab.key)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
