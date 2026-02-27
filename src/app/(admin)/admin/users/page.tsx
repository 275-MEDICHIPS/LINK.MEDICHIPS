"use client";

import { useState, useEffect, useCallback } from "react";
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
  X,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { csrfHeaders } from "@/lib/utils/csrf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRole = "LEARNER" | "INSTRUCTOR" | "SUPERVISOR" | "ORG_ADMIN" | "SUPER_ADMIN" | "MENTOR";
type UserStatus = "active" | "suspended" | "pending";

interface MemberRecord {
  id: string;
  role: UserRole;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    lastActiveAt: string | null;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleConfig: Record<string, { label: string; className: string }> = {
  LEARNER: { label: "Learner", className: "bg-brand-50 text-brand-700" },
  INSTRUCTOR: { label: "Instructor", className: "bg-purple-50 text-purple-700" },
  SUPERVISOR: { label: "Supervisor", className: "bg-amber-50 text-amber-700" },
  ORG_ADMIN: { label: "Admin", className: "bg-red-50 text-red-700" },
  SUPER_ADMIN: { label: "Super Admin", className: "bg-red-50 text-red-700" },
  MENTOR: { label: "Mentor", className: "bg-accent-50 text-accent-700" },
};

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-accent-50 text-accent-700" },
  suspended: { label: "Suspended", className: "bg-red-50 text-red-700" },
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
};

function getUserStatus(user: MemberRecord["user"]): UserStatus {
  if (!user.isActive) return "suspended";
  if (!user.lastActiveAt) return "pending";
  return "active";
}

function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) return "Never";
  const date = new Date(lastActiveAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

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
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
}) {
  const [role, setRole] = useState("LEARNER");
  const [expiresIn, setExpiresIn] = useState(7);
  const [maxUses, setMaxUses] = useState(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ inviteUrl: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/invite", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          organizationId: orgId,
          role,
          expiresIn,
          maxUses,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setResult({ inviteUrl: json.data.inviteUrl, code: json.data.code });
      } else {
        setError(json.error?.message || "Failed to create invite");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleClose = () => {
    setResult(null);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {result ? "Invite Created" : "Create Invite Link"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Invite Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono">
                  {result.code}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopy(result.code)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Invite URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono">
                  {result.inviteUrl}
                </code>
                <Button variant="outline" size="sm" onClick={() => handleCopy(result.inviteUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Share this link or code with users to invite them.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="invite-role" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <option value="LEARNER">Learner</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="MENTOR">Mentor</option>
                  <option value="ORG_ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="invite-expires" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Expires In (days)
                </label>
                <Input
                  id="invite-expires"
                  type="number"
                  min={1}
                  max={365}
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(parseInt(e.target.value) || 7)}
                />
              </div>
              <div>
                <label htmlFor="invite-max" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Max Uses
                </label>
                <Input
                  id="invite-max"
                  type="number"
                  min={1}
                  max={1000}
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {creating ? "Creating..." : "Generate Invite"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RowActions({ member }: { member: MemberRecord }) {
  const [open, setOpen] = useState(false);
  const status = getUserStatus(member.user);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label={`Actions for ${member.user.name}`}
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
            {status === "active" ? (
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
  const [orgId, setOrgId] = useState("");
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearch = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        setPage(1);
      }, 300)
    );
  };

  // Step 1: Get orgId from /users/me
  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/v1/users/me");
        const json = await res.json();
        if (json.data?.memberships?.[0]?.organization?.id) {
          setOrgId(json.data.memberships[0].organization.id);
        }
      } catch {
        setError("Failed to load user info");
        setLoading(false);
      }
    }
    fetchMe();
  }, []);

  // Step 2: Fetch members when orgId is available
  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/v1/organizations/${orgId}/members?${params.toString()}`);
      const json = await res.json();

      if (json.data) {
        setMembers(json.data);
        setTotal(json.pagination?.total || 0);
      } else {
        setError("Failed to load members");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orgId, page, pageSize, roleFilter, search]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const totalPages = Math.ceil(total / pageSize);

  // Compute stats from current data
  const activeCount = members.filter((m) => getUserStatus(m.user) === "active").length;
  const suspendedCount = members.filter((m) => getUserStatus(m.user) === "suspended").length;
  const pendingCount = members.filter((m) => getUserStatus(m.user) === "pending").length;

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
        <Button onClick={() => setInviteOpen(true)} disabled={!orgId}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Users
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] font-medium text-gray-500 sm:text-xs">Total</p>
            <p className="mt-0.5 text-lg font-bold text-accent-600 sm:mt-1 sm:text-2xl">
              {loading ? "-" : total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] font-medium text-gray-500 sm:text-xs">Suspended</p>
            <p className="mt-0.5 text-lg font-bold text-red-600 sm:mt-1 sm:text-2xl">
              {loading ? "-" : suspendedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[10px] font-medium text-gray-500 sm:text-xs">Pending</p>
            <p className="mt-0.5 text-lg font-bold text-amber-600 sm:mt-1 sm:text-2xl">
              {loading ? "-" : pendingCount}
            </p>
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
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name..."
                className="pl-9"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Role
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              {roleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {["all", "LEARNER", "INSTRUCTOR", "SUPERVISOR", "MENTOR", "ORG_ADMIN"].map(
                      (r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setRoleFilter(r);
                            setPage(1);
                            setRoleDropdownOpen(false);
                          }}
                          className={`flex w-full items-center px-3 py-2 text-sm ${
                            roleFilter === r
                              ? "bg-brand-50 font-medium text-brand-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {r === "all" ? "All Roles" : roleConfig[r]?.label || r}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          <p className="ml-2 text-sm text-gray-500">Loading users...</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
          <p className="mt-2 text-sm font-medium text-gray-500">{error}</p>
        </div>
      ) : members.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-500">No users found</p>
          <p className="mt-1 text-xs text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="space-y-2 md:hidden">
            {members.map((member) => {
              const status = getUserStatus(member.user);
              const rc = roleConfig[member.role] || { label: member.role, className: "bg-gray-100 text-gray-700" };
              const sc = statusConfig[status];
              return (
                <Card key={member.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <UserAvatar name={member.user.name || "?"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {member.user.name || "Unnamed"}
                        </p>
                        <p className="truncate text-xs text-gray-500">{member.user.email}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rc.className}`}>
                            {rc.label}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.className}`}>
                            {sc.label}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {formatLastActive(member.user.lastActiveAt)}
                          </span>
                        </div>
                      </div>
                      <RowActions member={member} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Role
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
                  {members.map((member) => {
                    const status = getUserStatus(member.user);
                    const rc = roleConfig[member.role] || { label: member.role, className: "bg-gray-100 text-gray-700" };
                    const sc = statusConfig[status];
                    return (
                      <tr
                        key={member.id}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={member.user.name || "?"} />
                            <p className="text-sm font-medium text-gray-900">
                              {member.user.name || "Unnamed"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{member.user.email}</p>
                          {member.user.phone && (
                            <p className="text-xs text-gray-400">{member.user.phone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rc.className}`}
                          >
                            {rc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.className}`}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                          {formatLastActive(member.user.lastActiveAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RowActions member={member} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages || 1} ({total} users)
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-brand-50 text-brand-700">
                    {page}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Mobile Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between px-1 py-2 md:hidden">
              <p className="text-xs text-gray-500">
                {page} / {totalPages || 1} ({total})
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        orgId={orgId}
      />
    </div>
  );
}
