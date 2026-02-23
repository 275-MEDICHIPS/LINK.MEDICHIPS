"use client";

import { useState } from "react";
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
  Globe,
  X,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  MoreHorizontal,
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

interface Program {
  id: string;
  name: string;
  country: string;
  members: number;
  courses: number;
}

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
}

interface Organization {
  id: string;
  name: string;
  type: "root" | "hospital" | "program_office" | "partner";
  memberCount: number;
  courseCount: number;
  children: Organization[];
  programs: Program[];
  apiKeys: ApiKeyRecord[];
  country?: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockOrgs: Organization[] = [
  {
    id: "org_001",
    name: "KOICA",
    type: "root",
    memberCount: 45,
    courseCount: 12,
    country: "KR",
    apiKeys: [
      { id: "key_1", name: "Production API", prefix: "mk_live_abc1", createdAt: "2025-11-01", lastUsed: "2 hours ago" },
    ],
    programs: [
      { id: "prog_1", name: "Ethiopia Healthcare Training", country: "ET", members: 120, courses: 8 },
      { id: "prog_2", name: "Tanzania Nursing Education", country: "TZ", members: 85, courses: 6 },
      { id: "prog_3", name: "Kenya Emergency Medicine", country: "KE", members: 64, courses: 5 },
    ],
    children: [
      {
        id: "org_002",
        name: "Addis Ababa University Hospital",
        type: "hospital",
        memberCount: 120,
        courseCount: 8,
        country: "ET",
        children: [],
        programs: [
          { id: "prog_4", name: "Emergency Medicine Program", country: "ET", members: 45, courses: 4 },
          { id: "prog_5", name: "Pediatrics Training", country: "ET", members: 30, courses: 3 },
        ],
        apiKeys: [],
      },
      {
        id: "org_003",
        name: "Muhimbili National Hospital",
        type: "hospital",
        memberCount: 85,
        courseCount: 6,
        country: "TZ",
        children: [],
        programs: [
          { id: "prog_6", name: "Nursing Fundamentals", country: "TZ", members: 55, courses: 4 },
        ],
        apiKeys: [],
      },
      {
        id: "org_004",
        name: "Kenyatta National Hospital",
        type: "hospital",
        memberCount: 64,
        courseCount: 5,
        country: "KE",
        children: [],
        programs: [
          { id: "prog_7", name: "Emergency Triage Training", country: "KE", members: 40, courses: 3 },
        ],
        apiKeys: [],
      },
      {
        id: "org_005",
        name: "King Faisal Hospital",
        type: "hospital",
        memberCount: 42,
        courseCount: 4,
        country: "RW",
        children: [],
        programs: [],
        apiKeys: [],
      },
    ],
  },
  {
    id: "org_006",
    name: "MEDICHIPS HQ",
    type: "root",
    memberCount: 12,
    courseCount: 34,
    country: "KR",
    children: [],
    programs: [],
    apiKeys: [
      { id: "key_2", name: "Development API", prefix: "mk_test_xyz2", createdAt: "2025-10-15", lastUsed: "30 minutes ago" },
      { id: "key_3", name: "Staging API", prefix: "mk_stg_def3", createdAt: "2025-12-01", lastUsed: "1 day ago" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Country flags (emoji text fallback for broad support)
// ---------------------------------------------------------------------------

const countryFlags: Record<string, string> = {
  KR: "KR",
  ET: "ET",
  TZ: "TZ",
  KE: "KE",
  RW: "RW",
  SD: "SD",
  NG: "NG",
  ZA: "ZA",
  CD: "CD",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OrgTreeNode({
  org,
  depth,
  selectedId,
  onSelect,
}: {
  org: Organization;
  depth: number;
  selectedId: string | null;
  onSelect: (org: Organization) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = org.children.length > 0;
  const isSelected = selectedId === org.id;

  const typeColors = {
    root: "bg-brand-100 text-brand-700",
    hospital: "bg-accent-100 text-accent-700",
    program_office: "bg-purple-100 text-purple-700",
    partner: "bg-amber-100 text-amber-700",
  };

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
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${typeColors[org.type]}`}
          >
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
          {org.country && (
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500">
              {countryFlags[org.country] || org.country}
            </span>
          )}
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

function OrgDetailPanel({ org }: { org: Organization }) {
  const [activeTab, setActiveTab] = useState<"overview" | "programs" | "apikeys" | "settings">(
    "overview"
  );
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

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
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{org.name}</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-500">
            {org.type.replace("_", " ")}
          </span>
        </div>
        {org.country && (
          <p className="mt-1 text-sm text-gray-500">
            Country: {countryFlags[org.country] || org.country}
          </p>
        )}
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
                  <p className="text-2xl font-bold text-gray-900">{org.programs.length}</p>
                  <p className="text-xs text-gray-500">Active Programs</p>
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
                        {child.country && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500">
                            {child.country}
                          </span>
                        )}
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {org.programs.length} program{org.programs.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Program
            </Button>
          </div>
          {org.programs.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-500">No programs yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Create a program to organize courses and members
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {org.programs.map((program) => (
                <Card key={program.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{program.name}</h3>
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500">
                            {program.country}
                          </span>
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {program.members} members
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> {program.courses} courses
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "apikeys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {org.apiKeys.length} API key{org.apiKeys.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Generate Key
            </Button>
          </div>
          {org.apiKeys.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
              <Key className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-500">No API keys</p>
              <p className="mt-1 text-xs text-gray-400">
                Generate an API key for programmatic access
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {org.apiKeys.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{apiKey.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {showApiKey === apiKey.id
                              ? `${apiKey.prefix}...xxxxxxxxxxxx`
                              : `${apiKey.prefix.slice(0, 8)}...`}
                          </code>
                          <button
                            onClick={() =>
                              setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)
                            }
                            className="text-gray-400 hover:text-gray-600"
                            aria-label={showApiKey === apiKey.id ? "Hide key" : "Show key"}
                          >
                            {showApiKey === apiKey.id ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            aria-label="Copy key"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Created {apiKey.createdAt} &middot; Last used {apiKey.lastUsed}
                        </p>
                      </div>
                      <button
                        className="text-gray-400 hover:text-red-500"
                        aria-label="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Organization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <Input id="org-name" defaultValue={org.name} />
              </div>
              <div>
                <label htmlFor="org-type" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  id="org-type"
                  defaultValue={org.type}
                  className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <option value="root">Root Organization</option>
                  <option value="hospital">Hospital</option>
                  <option value="program_office">Program Office</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div>
                <label htmlFor="org-country" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Country
                </label>
                <Input id="org-country" defaultValue={org.country || ""} placeholder="e.g., KE" />
              </div>
              <div className="flex justify-end">
                <Button size="sm">Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-700">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">
                Deleting this organization will remove all members, programs, and data.
                This action cannot be undone.
              </p>
              <Button variant="destructive" size="sm" className="mt-3">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CreateOrgDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

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
            <Input id="new-org-name" placeholder="e.g., Kigali General Hospital" />
          </div>
          <div>
            <label htmlFor="new-org-type" className="mb-1.5 block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="new-org-type"
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="hospital">Hospital</option>
              <option value="program_office">Program Office</option>
              <option value="partner">Partner</option>
            </select>
          </div>
          <div>
            <label htmlFor="new-org-parent" className="mb-1.5 block text-sm font-medium text-gray-700">
              Parent Organization
            </label>
            <select
              id="new-org-parent"
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">None (Root)</option>
              <option value="org_001">KOICA</option>
              <option value="org_006">MEDICHIPS HQ</option>
            </select>
          </div>
          <div>
            <label htmlFor="new-org-country" className="mb-1.5 block text-sm font-medium text-gray-700">
              Country Code
            </label>
            <Input id="new-org-country" placeholder="e.g., RW" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
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
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(mockOrgs[0]);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage organizational hierarchy, programs, and API access
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      {/* Main Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tree View */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Organization Tree</CardTitle>
            <CardDescription>Click an organization to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {mockOrgs.map((org) => (
                <OrgTreeNode
                  key={org.id}
                  org={org}
                  depth={0}
                  selectedId={selectedOrg?.id || null}
                  onSelect={setSelectedOrg}
                />
              ))}
            </div>
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

      {/* Create Dialog */}
      <CreateOrgDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
