import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Trophy,
  BarChart3,
} from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/courses", icon: BookOpen, label: "Courses" },
  { href: "/tasks", icon: ClipboardCheck, label: "Tasks" },
  { href: "/achievements", icon: Trophy, label: "Awards" },
  { href: "/leaderboard", icon: BarChart3, label: "Rank" },
];

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Medichips Link" width={28} height={28} className="rounded-md" />
            <span className="text-sm font-bold text-gray-900">LINK</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* Offline indicator placeholder */}
            <div className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">
              Online
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-4">{children}</main>

      {/* Bottom tab bar */}
      <nav className="sticky bottom-0 z-40 border-t border-gray-100 bg-white pb-safe">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-3 py-1 text-gray-500 transition-colors hover:text-brand-500"
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
