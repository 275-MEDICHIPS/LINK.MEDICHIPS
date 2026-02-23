import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Users,
  Building2,
  BarChart3,
  Languages,
  Settings,
} from "lucide-react";

const sidebarItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/courses", icon: BookOpen, label: "Courses" },
  { href: "/admin/ai-builder", icon: Sparkles, label: "AI Builder" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/orgs", icon: Building2, label: "Organizations" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/translations", icon: Languages, label: "Translations" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900">LINK</span>
            <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              Admin
            </span>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-500"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-4 left-3 right-3">
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
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
