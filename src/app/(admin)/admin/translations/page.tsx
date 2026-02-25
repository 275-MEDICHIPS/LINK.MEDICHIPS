"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Languages,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Loader2,
  AlertCircle,
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

type TranslationStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED";

interface TranslationJob {
  id: string;
  sourceLocale: string;
  targetLocale: string;
  entityType: string;
  entityId: string;
  status: TranslationStatus;
  method: string;
  sourceText: string;
  translatedText: string | null;
  isVerified: boolean;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const languageLabels: Record<string, string> = {
  en: "English",
  ko: "Korean",
  fr: "French",
  sw: "Swahili",
  am: "Amharic",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  IN_PROGRESS: { label: "In Progress", className: "bg-brand-50 text-brand-700" },
  COMPLETED: { label: "Done", className: "bg-accent-50 text-accent-700" },
  VERIFIED: { label: "Verified", className: "bg-purple-50 text-purple-700" },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TranslationSidePanel({
  item,
  onClose,
}: {
  item: TranslationJob;
  onClose: () => void;
}) {
  const sc = statusConfig[item.status] || statusConfig.PENDING;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-3xl flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {item.entityType} Translation
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {item.entityType} &middot; {item.entityId.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
              {sc.label}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Side-by-side */}
        <div className="flex flex-1 overflow-hidden">
          {/* Original */}
          <div className="flex-1 overflow-y-auto border-r border-gray-100 p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                {languageLabels[item.sourceLocale] || item.sourceLocale}
              </span>
              <span className="text-xs text-gray-400">Original</span>
            </div>
            <div className="text-sm leading-relaxed text-gray-700">
              {item.sourceText}
            </div>
          </div>

          {/* Translation */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {languageLabels[item.targetLocale] || item.targetLocale}
              </span>
              <span className="text-xs text-gray-400">Translation</span>
              {item.method === "ai" && (
                <span className="rounded bg-purple-50 px-1.5 py-0.5 text-xs text-purple-600">
                  AI
                </span>
              )}
            </div>
            {item.translatedText ? (
              <div className="text-sm leading-relaxed text-gray-700">
                {item.translatedText}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                <Languages className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No translation yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {item.translatedText && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Method: {item.method}</span>
              {item.isVerified && (
                <span className="flex items-center gap-1 text-accent-600">
                  <Check className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {item.status === "COMPLETED" && (
                <>
                  <Button variant="outline" size="sm">
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-red-500" />
                    Reject
                  </Button>
                  <Button size="sm">
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Approve & Verify
                  </Button>
                </>
              )}
              {item.status === "VERIFIED" && (
                <span className="flex items-center gap-1 text-xs font-medium text-accent-600">
                  <Check className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BatchTranslateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("fr");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleStart = async () => {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/translations", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          entityType: "LESSON",
          entityId: crypto.randomUUID(),
          sourceLocale: sourceLang,
          targetLocale: targetLang,
          sourceText: "Batch translation job placeholder",
          method: "ai",
        }),
      });

      if (res.ok) {
        onClose();
        onCreated();
      } else {
        const json = await res.json();
        setError(json.error?.message || "Failed to create translation job");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">AI Batch Translation</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="batch-source" className="mb-1.5 block text-sm font-medium text-gray-700">
              Source Language
            </label>
            <select
              id="batch-source"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="en">English</option>
              <option value="ko">Korean</option>
            </select>
          </div>
          <div>
            <label htmlFor="batch-target" className="mb-1.5 block text-sm font-medium text-gray-700">
              Target Language
            </label>
            <select
              id="batch-target"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="fr">French</option>
              <option value="sw">Swahili</option>
              <option value="am">Amharic</option>
              <option value="ko">Korean</option>
            </select>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-xs text-amber-700">
              <strong>Note:</strong> AI translations of medical content will be marked as &quot;Done&quot;
              and require human verification before being made available to learners.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart} disabled={running}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Translation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TranslationsPage() {
  const [items, setItems] = useState<TranslationJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<TranslationJob | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const fetchTranslations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (langFilter !== "all") params.set("locale", langFilter);

      const res = await fetch(`/api/v1/admin/translations?${params.toString()}`);
      const json = await res.json();

      if (json.data) {
        setItems(json.data);
        setTotal(json.pagination?.total || 0);
      } else {
        setError("Failed to load translations");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, langFilter]);

  useEffect(() => {
    fetchTranslations();
  }, [fetchTranslations]);

  // Client-side search filter (API doesn't support search param)
  const filtered = search
    ? items.filter(
        (t) =>
          t.entityType.toLowerCase().includes(search.toLowerCase()) ||
          t.sourceText.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Translations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage multilingual content translations with AI assistance
          </p>
        </div>
        <Button onClick={() => setBatchOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Start AI Translation
        </Button>
      </div>

      {/* Status Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { key: "PENDING", label: "Pending" },
          { key: "IN_PROGRESS", label: "In Progress" },
          { key: "COMPLETED", label: "Done" },
          { key: "VERIFIED", label: "Verified" },
        ].map(({ key, label }) => {
          const sc = statusConfig[key];
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {statusFilter === key ? total : "-"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sc.className}`}>
                    {sc.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                placeholder="Search content..."
                className="pl-9"
              />
            </div>

            {/* Language filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setStatusDropdownOpen(false);
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Language
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              {langDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangDropdownOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {["all", "ko", "fr", "sw", "am"].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLangFilter(lang);
                          setPage(1);
                          setLangDropdownOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-sm ${
                          langFilter === lang
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {lang === "all" ? "All Languages" : languageLabels[lang] || lang}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Status filter */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusDropdownOpen(!statusDropdownOpen);
                  setLangDropdownOpen(false);
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Status
                <ChevronDown className="ml-2 h-3.5 w-3.5" />
              </Button>
              {statusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    {["all", "PENDING", "IN_PROGRESS", "COMPLETED", "VERIFIED"].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setPage(1);
                          setStatusDropdownOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-sm ${
                          statusFilter === s
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {s === "all" ? "All Statuses" : (statusConfig[s]?.label || s)}
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
                  Content
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                  Method
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-500" />
                    <p className="mt-2 text-sm text-gray-500">Loading translations...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <AlertCircle className="mx-auto h-10 w-10 text-red-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">{error}</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Languages className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-500">No translations found</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try adjusting your search or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const sc = statusConfig[item.status] || statusConfig.PENDING;
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{item.entityType}</p>
                        <p className="max-w-xs truncate text-xs text-gray-500">
                          {item.sourceText.slice(0, 60)}...
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-600">
                          {item.sourceLocale}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase text-brand-700">
                          {item.targetLocale}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.className}`}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-600">{item.method}</span>
                          {item.method === "ai" && (
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          )}
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          View
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages || 1} ({total} translations)
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

      {/* Side Panel */}
      {selectedItem && (
        <TranslationSidePanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Batch Translate Dialog */}
      <BatchTranslateDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onCreated={fetchTranslations}
      />
    </div>
  );
}
