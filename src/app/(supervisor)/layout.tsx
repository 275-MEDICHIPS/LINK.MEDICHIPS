import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
} from "lucide-react";

const sidebarItems = [
  { href: "/supervisor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/supervisor/learners", icon: Users, label: "Learners" },
  { href: "/supervisor/tasks", icon: ClipboardCheck, label: "Tasks" },
  { href: "/supervisor/reports", icon: FileText, label: "Reports" },
];

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-56 flex-shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <div>
            <span className="text-sm font-bold text-gray-900">LINK</span>
            <span className="ml-1 rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-medium text-accent-700">
              Supervisor
            </span>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-accent-600"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b border-gray-100 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-900">Supervisor</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
