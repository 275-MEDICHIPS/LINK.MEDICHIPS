"use client";

import { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Filter,
  MoreHorizontal,
  Eye,
  Shield,
  Ban,
  KeyRound,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Upload,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = "learner" | "instructor" | "supervisor" | "admin" | "reviewer";
type UserStatus = "active" | "suspended" | "pending";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  organization: string;
  status: UserStatus;
  lastActive: string;
  avatar?: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockUsers: UserRecord[] = [
  { id: "u_001", name: "Dr. Amina Osei", email: "amina.osei@hospital.et", phone: "+251911234567", role: "learner", organization: "Addis Ababa University Hospital", status: "active", lastActive: "2 hours ago" },
  { id: "u_002", name: "Jean-Pierre Mbeki", email: "jp.mbeki@clinic.cd", role: "learner", organization: "Muhimbili Hospital", status: "active", lastActive: "5 hours ago" },
  { id: "u_003", name: "Dr. Kim Seonghyun", email: "kim.sh@medichips.ai", role: "admin", organization: "MEDICHIPS HQ", status: "active", lastActive: "30 minutes ago" },
  { id: "u_004", name: "Sarah Kimani", email: "s.kimani@hospital.ke", phone: "+254712345678", role: "learner", organization: "Kenyatta National Hospital", status: "active", lastActive: "1 day ago" },
  { id: "u_005", name: "Dr. Tanaka Yuki", email: "tanaka@koica.go.kr", role: "supervisor", organization: "KOICA", status: "active", lastActive: "3 hours ago" },
  { id: "u_006", name: "Nurse Mpho Dlamini", email: "mpho.d@clinic.za", role: "instructor", organization: "Chris Hani Baragwanath Hospital", status: "active", lastActive: "12 hours ago" },
  { id: "u_007", name: "Dr. Williams Okafor", email: "w.okafor@hospital.ng", role: "reviewer", organization: "University of Lagos Teaching Hospital", status: "active", lastActive: "2 days ago" },
  { id: "u_008", name: "Fatima Al-Hassan", email: "fatima@clinic.sd", role: "learner", organization: "Khartoum Teaching Hospital", status: "suspended", lastActive: "2 weeks ago" },
  { id: "u_009", name: "Dr. Chen Wei", email: "chen.w@medichips.ai", role: "instructor", organization: "MEDICHIPS HQ", status: "active", lastActive: "1 hour ago" },
  { id: "u_010", name: "Grace Mutesi", email: "g.mutesi@hospital.rw", role: "learner", organization: "King Faisal Hospital", status: "pending", lastActive: "Never" },
];

const organizations = [
  "All Organizations",
  "MEDICHIPS HQ",
  "KOICA",
  "Addis Ababa University Hospital",
  "Muhimbili Hospital",
  "Kenyatta National Hospital",
  "King Faisal Hospital",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  learner: { label: "Learner", className: "bg-brand-50 text-brand-700" },
  instructor: { label: "Instructor", className: "bg-purple-50 text-purple-700" },
  supervisor: { label: "Supervisor", className: "bg-amber-50 text-amber-700" },
  admin: { label: "Admin", className: "bg-red-50 text-red-700" },
  reviewer: { label: "Reviewer", className: "bg-accent-50 text-accent-700" },
};

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-accent-50 text-accent-700" },
  suspended: { label: "Suspended", className: "bg-red-50 text-red-700" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    "bg-brand-100 text-brand-700",
    "bg-accent-100 text-accent-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-red-100 text-red-700",
  ];

  const colorIdx = name.length % colors.length;

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${colors[colorIdx]}`}
    >
      {initials}
    </div>
  );
}

function InviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"single" | "csv">("single");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Invite Users</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === "single" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Single Invite
          </button>
          <button
            onClick={() => setMode("csv")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === "csv" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Bulk CSV
          </button>
        </div>

        {mode === "single" ? (
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email or Phone
              </label>
              <Input id="invite-email" placeholder="user@hospital.org or +251..." />
            </div>
            <div>
              <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="invite-role"
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="learner">Learner</option>
                <option value="instructor">Instructor</option>
                <option value="supervisor">Supervisor</option>
                <option value="reviewer">Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label htmlFor="invite-org" className="mb-1.5 block text-sm font-medium text-gray-700">
                Organization
              </label>
              <select
                id="invite-org"
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {organizations.slice(1).map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8">
              <Upload className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-600">Upload CSV file</p>
              <p className="mt-1 text-xs text-gray-400">
                Required columns: name, email/phone, role, organization
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Choose File
              </Button>
            </div>
            <button className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
              <Download className="h-3.5 w-3.5" />
              Download CSV template
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            {mode === "single" ? "Send Invite" : "Import Users"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RowActions({ user }: { user: UserRecord }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label={`Actions for ${user.name}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Eye className="h-3.5 w-3.5" /> View Profile
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Shield className="h-3.5 w-3.5" /> Change Role
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <KeyRound className="h-3.5 w-3.5" /> Reset PIN
            </button>
            <div className="my-1 border-t border-gray-100" />
            {user.status === "active" ? (
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                <Ban className="h-3.5 w-3.5" /> Suspend User
              </button>
            ) : (
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-accent-600 hover:bg-accent-50">
                <Shield className="h-3.5 w-3.5" /> Reactivate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [orgFilter, setOrgFilter] = useState("All Organizations");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.includes(search));
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesOrg =
        orgFilter === "All Organizations" || u.organization === orgFilter;
      return matchesSearch && matchesRole && matchesOrg;
    });
  }, [search, roleFilter, orgFilter]);

  const totalByStatus = {
    active: mockUsers.filter((u) => u.status === "active").length,
    suspended: mockUsers.filter((u) => u.status === "suspended").length,
    pending: mockUsers.filter((u) => u.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage platform users, roles, and access
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Users
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Active Users</p>
                <p className="mt-1 text-2xl font-bold text-accent-600">{totalByStatus.active}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50">
                <Users className="h-5 w-5 text-accent-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Suspended</p>
                <p className="mt-1 text-2xl font-bold text-red-600">{totalByStatus.suspended}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Pending Invites</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{totalByStatus.pending}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="pl-9"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRoleDropdownOpen(!roleDropdownOpen);
                  setOrgDropdownOpen(false);
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Role
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              {roleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {(["all", "learner", "instructor", "supervisor", "reviewer", "admin"] as const).map(
                      (r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setRoleFilter(r);
                            setRoleDropdownOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-2 text-sm ${
                            roleFilter === r
                              ? "bg-brand-50 font-medium text-brand-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {r === "all" ? "All Roles" : roleConfig[r].label}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Org filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOrgDropdownOpen(!orgDropdownOpen);
                  setRoleDropdownOpen(false);
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Org
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              {orgDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOrgDropdownOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {organizations.map((org) => (
                      <button
                        key={org}
                        onClick={() => {
                          setOrgFilter(org);
                          setOrgDropdownOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-sm ${
                          orgFilter === org
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                  Last Active
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Users className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">No users found</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500 md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.phone && (
                        <p className="text-xs text-gray-400">{user.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          roleConfig[user.role].className
                        }`}
                      >
                        {roleConfig[user.role].label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-600 lg:table-cell">
                      {user.organization}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusConfig[user.status].className
                        }`}
                      >
                        {statusConfig[user.status].label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                      {user.lastActive}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActions user={user} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing 1-{filtered.length} of {filtered.length} users
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="bg-brand-50 text-brand-700">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Invite Dialog */}
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
