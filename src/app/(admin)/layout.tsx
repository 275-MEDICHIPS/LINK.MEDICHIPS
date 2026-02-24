"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Film,
  Users,
  Building2,
  BarChart3,
  Languages,
  Settings,
  Home,
} from "lucide-react";

const sidebarItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/courses", icon: BookOpen, label: "Courses" },
  { href: "/admin/ai-builder", icon: Sparkles, label: "AI Builder" },
  { href: "/admin/video-production", icon: Film, label: "Video Studio" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/orgs", icon: Building2, label: "Organizations" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/translations", icon: Languages, label: "Translations" },
];

const bottomTabs = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "홈" },
  { href: "/admin/courses", icon: BookOpen, label: "코스" },
  { href: "/admin/video-production", icon: Film, label: "비디오" },
  { href: "/admin/users", icon: Users, label: "유저" },
  { href: "/admin/analytics", icon: BarChart3, label: "통계" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top header — same structure as learner layout */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" />
              <span className="text-sm font-bold text-gray-900">LINK</span>
            </Link>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              Admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            <Home className="h-3 w-3" />
            학습 홈
          </Link>
        </div>
      </header>

      {/* Main content — same padding as learner layout */}
      <main className="flex-1 px-4 py-4">{children}</main>

      {/* Bottom tab bar — same structure as learner layout */}
      <nav className="sticky bottom-0 z-40 border-t border-gray-100 bg-white pb-safe">
        <div className="flex items-center justify-around py-2">
          {bottomTabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                  active ? "text-brand-500" : "text-gray-500 hover:text-brand-500"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
