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
  ClipboardCheck,
  Settings,
  Home,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const sidebarItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/courses", icon: BookOpen, label: "Courses" },
  { href: "/admin/ai-builder", icon: Sparkles, label: "AI Builder" },
  { href: "/admin/video-production", icon: Film, label: "Video Studio" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/orgs", icon: Building2, label: "Organizations" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/translations", icon: Languages, label: "Translations" },
  { href: "/admin/content-review", icon: ClipboardCheck, label: "Content Review" },
];

const bottomItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/admin/courses", icon: BookOpen, label: "Courses" },
  { href: "/admin/video-production", icon: Film, label: "Video" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-gray-200 bg-white lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" />
            <span className="text-sm font-bold text-gray-900">LINK</span>
          </Link>
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600">
            Admin
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {sidebarItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-brand-500" : "text-gray-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-100 px-2 py-3 space-y-0.5">
          {(() => {
            const settingsActive = pathname.startsWith("/admin/settings");
            return (
              <Link
                href="/admin/settings"
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  settingsActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Settings className={`h-4 w-4 ${settingsActive ? "text-brand-500" : "text-gray-400"}`} />
                Settings
              </Link>
            );
          })()}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <Home className="h-4 w-4 text-gray-400" />
            Learner Home
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" />
                <span className="text-sm font-bold text-gray-900">LINK Admin</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-0.5 px-2 py-3">
              {sidebarItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <item.icon className={`h-4.5 w-4.5 ${active ? "text-brand-500" : "text-gray-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-56">
        {/* Top header - mobile only shows hamburger, desktop shows breadcrumb area */}
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/admin/dashboard" className="flex items-center gap-2 lg:hidden">
                <Image src="/logo.png" alt="Medichips Link" width={24} height={24} className="rounded-md" />
                <span className="text-sm font-bold text-gray-900">LINK</span>
              </Link>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 active:bg-gray-300 lg:hidden"
            >
              <Home className="h-3 w-3" />
              Learner Home
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main ref={mainRef} className="flex-1 px-4 py-4 lg:px-6 lg:py-6">{children}</main>

        {/* Bottom tab bar — mobile only */}
        <nav className="sticky bottom-0 z-20 border-t border-gray-100 bg-white pb-safe lg:hidden">
          <div className="flex items-center justify-around py-2">
            {bottomItems.map((tab) => {
              const active = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                    active ? "text-brand-500" : "text-gray-400 hover:text-brand-500"
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
