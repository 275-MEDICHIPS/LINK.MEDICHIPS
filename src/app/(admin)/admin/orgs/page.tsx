"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Plus,
  Users,
  BookOpen,
  Key,
  Settings,
  FolderOpen,
  X,
  Loader2,
  AlertCircle,
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
import { csrfHeaders } from "@/lib/utils/csrf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiOrg {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  children: { id: string; name: string }[];
  _count: { memberships: number; programs: number; courses: number };
}

interface TreeOrg {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  memberCount: number;
  courseCount: number;
  programCount: number;
  children: TreeOrg[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTree(flatOrgs: ApiOrg[]): TreeOrg[] {
  const map = new Map<string, TreeOrg>();
  const roots: TreeOrg[] = [];

  // Create TreeOrg for each
  for (const org of flatOrgs) {
    map.set(org.id, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      parentId: org.parentId || null,
      memberCount: org._count?.memberships || 0,
      courseCount: org._count?.courses || 0,
      programCount: org._count?.programs || 0,
      children: [],
    });
  }

  // Build hierarchy
  for (const org of flatOrgs) {
    const node = map.get(org.id)!;
    if (org.parentId && map.has(org.parentId)) {
      map.get(org.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OrgTreeNode({
  org,
  depth,
  selectedId,
  onSelect,
}: {
  org: TreeOrg;
  depth: number;
  selectedId: string | null;
  onSelect: (org: TreeOrg) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = org.children.length > 0;
  const isSelected = selectedId === org.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
          isSelected ? "bg-brand-50" : "hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-gray-400"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <button
          onClick={() => onSelect(org)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-sm ${
                isSelected ? "font-semibold text-brand-700" : "font-medium text-gray-900"
              }`}
            >
              {org.name}
            </p>
            <p className="text-xs text-gray-400">
              {org.memberCount} members &middot; {org.courseCount} courses
            </p>
          </div>
        </button>
      </div>

      {expanded &&
        org.children.map((child) => (
          <OrgTreeNode
            key={child.id}
            org={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

function OrgDetailPanel({ org }: { org: TreeOrg }) {
  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "apikeys" | "settings">(
    "overview"
  );

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Building2 },
    { key: "programs" as const, label: "Programs", icon: FolderOpen },
    { key: "apikeys" as const, label: "API Keys", icon: Key },
    { key: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">{org.name}</h2>
        <p className="mt-1 text-sm text-gray-500">slug: {org.slug}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <Users className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{org.memberCount}</p>
                  <p className="text-xs text-gray-500">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50">
                  <BookOpen className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{org.courseCount}</p>
                  <p className="text-xs text-gray-500">Courses Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <FolderOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{org.programCount}</p>
                  <p className="text-xs text-gray-500">Programs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {org.children.length > 0 && (
            <Card className="sm:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sub-organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {org.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{child.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{child.memberCount} members</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "programs" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {org.programCount} program{org.programCount !== 1 ? "s" : ""}
          </p>
          {org.programCount === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-500">No programs yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Programs data is available via the organization API
              </p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-500">
                {org.programCount} programs linked
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Program management is coming soon
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "apikeys" && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
            <Key className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-500">Coming soon</p>
            <p className="mt-1 text-xs text-gray-400">
              API key management is under development
            </p>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Organization Settings</CardTitle>
              <CardDescription>Read-only view. Editing coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <Input value={org.name} readOnly className="bg-gray-50" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Slug
                </label>
                <Input value={org.slug} readOnly className="bg-gray-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CreateOrgDialog({
  open,
  onClose,
  orgs,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  orgs: TreeOrg[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 100)
    );
  };

  // Flatten tree for parent select
  const flatOrgs: { id: string; name: string; depth: number }[] = [];
  const flatten = (nodes: TreeOrg[], depth: number) => {
    for (const n of nodes) {
      flatOrgs.push({ id: n.id, name: n.name, depth });
      flatten(n.children, depth + 1);
    }
  };
  flatten(orgs, 0);

  const handleCreate = async () => {
    if (!name.trim() || !slug.trim()) return;
    setCreating(true);
    setError("");
    try {
      const body: Record<string, string> = { name: name.trim(), slug };
      if (parentId) body.parentId = parentId;

      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setName("");
        setSlug("");
        setParentId("");
        onClose();
        onCreated();
      } else {
        const json = await res.json();
        setError(json.error?.message || "Failed to create organization");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Organization</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-org-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Organization Name
            </label>
            <Input
              id="new-org-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Kigali General Hospital"
            />
          </div>
          <div>
            <label htmlFor="new-org-slug" className="mb-1.5 block text-sm font-medium text-gray-700">
              Slug
            </label>
            <Input
              id="new-org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., kigali-general"
            />
          </div>
          <div>
            <label htmlFor="new-org-parent" className="mb-1.5 block text-sm font-medium text-gray-700">
              Parent Organization
            </label>
            <select
              id="new-org-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">None (Root)</option>
              {flatOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {"  ".repeat(o.depth)}{o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !slug.trim() || creating}>
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {creating ? "Creating..." : "Create Organization"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<TreeOrg[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<TreeOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/organizations?page=1&limit=100");
      const json = await res.json();

      if (json.data) {
        const tree = buildTree(json.data);
        setOrgs(tree);
        if (tree.length > 0 && !selectedOrg) {
          setSelectedOrg(tree[0]);
        }
      } else {
        setError("Failed to load organizations");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage organizational hierarchy, programs, and access
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-10 w-10 text-red-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchOrgs}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Main Layout */
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Tree View */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Organization Tree</CardTitle>
              <CardDescription>Click an organization to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {orgs.length === 0 ? (
                <div className="py-8 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No organizations yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {orgs.map((org) => (
                    <OrgTreeNode
                      key={org.id}
                      org={org}
                      depth={0}
                      selectedId={selectedOrg?.id || null}
                      onSelect={setSelectedOrg}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail Panel */}
          <div className="lg:col-span-3">
            {selectedOrg ? (
              <OrgDetailPanel org={selectedOrg} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-200" />
                    <p className="mt-3 text-sm font-medium text-gray-500">
                      Select an organization
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Click on an organization in the tree to view its details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateOrgDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgs={orgs}
        onCreated={fetchOrgs}
      />
    </div>
  );
}
