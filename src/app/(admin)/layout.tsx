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

// Bottom tabs for mobile (subset of sidebar items)
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" />
            <span className="text-sm font-bold text-gray-900">LINK</span>
          </Link>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            Admin
          </span>
        </div>

        <nav className="space-y-1 p-3">
          {sidebarItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-brand-500"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
            학습 홈으로
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
                <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" />
                <span className="text-sm font-bold text-gray-900">LINK</span>
              </Link>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 lg:hidden">
                Admin
              </span>
              <h1 className="hidden text-lg font-semibold text-gray-900 lg:block">Admin</h1>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 lg:hidden"
            >
              <Home className="h-3 w-3" />
              학습 홈
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 lg:p-6">{children}</main>

        {/* Mobile bottom tabs */}
        <nav className="sticky bottom-0 z-40 border-t border-gray-100 bg-white pb-safe lg:hidden">
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
    </div>
  );
}
