"use client";

import { useState, useMemo } from "react";
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

type TranslationStatus = "pending" | "in_progress" | "done" | "verified";

interface TranslationItem {
  id: string;
  contentTitle: string;
  contentPath: string;
  sourceLang: string;
  targetLang: string;
  status: TranslationStatus;
  translator: string | null;
  originalText: string;
  translatedText: string;
  medicalTerms: string[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const languageLabels: Record<string, string> = {
  en: "English",
  ko: "Korean",
  fr: "French",
  sw: "Swahili",
  am: "Amharic",
};

const mockTranslations: TranslationItem[] = [
  {
    id: "tr_001",
    contentTitle: "What is Triage?",
    contentPath: "Emergency Triage Protocol > Introduction > Lesson 1",
    sourceLang: "en",
    targetLang: "ko",
    status: "verified",
    translator: "Dr. Kim Seonghyun",
    originalText:
      "Triage is a process of prioritizing patients based on the severity of their condition. In emergency settings, effective triage ensures that limited resources are directed to those who need them most. The START (Simple Triage And Rapid Treatment) system is the most widely used method.",
    translatedText:
      "트리아지(Triage)는 환자의 상태 심각도를 기반으로 우선순위를 결정하는 과정입니다. 응급 상황에서 효과적인 트리아지는 제한된 자원이 가장 필요한 사람에게 전달되도록 보장합니다. START(Simple Triage And Rapid Treatment) 시스템은 가장 널리 사용되는 방법입니다.",
    medicalTerms: ["Triage", "START", "emergency"],
    updatedAt: "2026-02-23",
  },
  {
    id: "tr_002",
    contentTitle: "What is Triage?",
    contentPath: "Emergency Triage Protocol > Introduction > Lesson 1",
    sourceLang: "en",
    targetLang: "fr",
    status: "in_progress",
    translator: "Dr. Jean-Pierre M.",
    originalText:
      "Triage is a process of prioritizing patients based on the severity of their condition. In emergency settings, effective triage ensures that limited resources are directed to those who need them most.",
    translatedText:
      "Le triage est un processus de priorisation des patients en fonction de la gravite de leur etat. Dans les situations d'urgence, un triage efficace garantit que les ressources limitees sont dirigees vers ceux qui en ont le plus besoin.",
    medicalTerms: ["Triage", "emergency"],
    updatedAt: "2026-02-22",
  },
  {
    id: "tr_003",
    contentTitle: "What is Triage?",
    contentPath: "Emergency Triage Protocol > Introduction > Lesson 1",
    sourceLang: "en",
    targetLang: "sw",
    status: "pending",
    translator: null,
    originalText:
      "Triage is a process of prioritizing patients based on the severity of their condition.",
    translatedText: "",
    medicalTerms: ["Triage"],
    updatedAt: "2026-02-20",
  },
  {
    id: "tr_004",
    contentTitle: "5 Moments of Hand Hygiene",
    contentPath: "IPC Training > Hand Hygiene > Lesson 1",
    sourceLang: "en",
    targetLang: "ko",
    status: "done",
    translator: "AI Translation",
    originalText:
      "The WHO 5 moments for hand hygiene are: before touching a patient, before clean/aseptic procedures, after body fluid exposure risk, after touching a patient, and after touching patient surroundings.",
    translatedText:
      "WHO 손 위생 5가지 시점: 환자 접촉 전, 청결/무균 처치 전, 체액 노출 위험 후, 환자 접촉 후, 환자 주변 환경 접촉 후.",
    medicalTerms: ["hand hygiene", "aseptic", "body fluid"],
    updatedAt: "2026-02-22",
  },
  {
    id: "tr_005",
    contentTitle: "5 Moments of Hand Hygiene",
    contentPath: "IPC Training > Hand Hygiene > Lesson 1",
    sourceLang: "en",
    targetLang: "fr",
    status: "pending",
    translator: null,
    originalText:
      "The WHO 5 moments for hand hygiene are: before touching a patient, before clean/aseptic procedures, after body fluid exposure risk, after touching a patient, and after touching patient surroundings.",
    translatedText: "",
    medicalTerms: ["hand hygiene", "aseptic", "body fluid"],
    updatedAt: "2026-02-21",
  },
  {
    id: "tr_006",
    contentTitle: "Types of PPE",
    contentPath: "IPC Training > PPE > Lesson 1",
    sourceLang: "en",
    targetLang: "am",
    status: "pending",
    translator: null,
    originalText:
      "Personal Protective Equipment includes gloves, gowns, masks, respirators, eye protection, and face shields.",
    translatedText: "",
    medicalTerms: ["PPE", "respirators"],
    updatedAt: "2026-02-20",
  },
  {
    id: "tr_007",
    contentTitle: "START Method Overview",
    contentPath: "Emergency Triage > START System > Lesson 1",
    sourceLang: "en",
    targetLang: "ko",
    status: "in_progress",
    translator: "AI Translation",
    originalText:
      "The START system classifies patients into four categories: Immediate (Red), Delayed (Yellow), Minor (Green), and Deceased (Black).",
    translatedText:
      "START 시스템은 환자를 네 가지 범주로 분류합니다: 즉각(적색), 지연(황색), 경미(녹색), 사망(흑색).",
    medicalTerms: ["START", "Immediate", "Delayed", "Minor", "Deceased"],
    updatedAt: "2026-02-24",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<TranslationStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", className: "bg-brand-50 text-brand-700" },
  done: { label: "Done", className: "bg-accent-50 text-accent-700" },
  verified: { label: "Verified", className: "bg-purple-50 text-purple-700" },
};

function highlightTerms(text: string, terms: string[]): React.ReactNode {
  if (!text || terms.length === 0) return text;

  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <span
          key={i}
          className="rounded bg-amber-100 px-0.5 font-medium text-amber-800"
          title="Medical term"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TranslationSidePanel({
  item,
  onClose,
}: {
  item: TranslationItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-3xl flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{item.contentTitle}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{item.contentPath}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusConfig[item.status].className
              }`}
            >
              {statusConfig[item.status].label}
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
                {languageLabels[item.sourceLang] || item.sourceLang}
              </span>
              <span className="text-xs text-gray-400">Original</span>
            </div>
            <div className="text-sm leading-relaxed text-gray-700">
              {highlightTerms(item.originalText, item.medicalTerms)}
            </div>

            {item.medicalTerms.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Medical Terms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.medicalTerms.map((term) => (
                    <span
                      key={term}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Translation */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {languageLabels[item.targetLang] || item.targetLang}
              </span>
              <span className="text-xs text-gray-400">Translation</span>
              {item.translator === "AI Translation" && (
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
                <Button size="sm" className="mt-3">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Generate AI Translation
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {item.translatedText && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {item.translator && (
                <>
                  <span>Translated by:</span>
                  <span className="font-medium text-gray-700">{item.translator}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {item.status === "done" && (
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
              {item.status === "in_progress" && (
                <Button size="sm">
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Mark as Done
                </Button>
              )}
              {item.status === "verified" && (
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);

  if (!open) return null;

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
              <strong>Note:</strong> AI translations of medical content will be marked as "Done"
              and require human verification before being made available to learners.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              setRunning(true);
              setTimeout(() => {
                setRunning(false);
                onClose();
              }, 2000);
            }}
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Translating...
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
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<TranslationStatus | "all">("all");
  const [selectedItem, setSelectedItem] = useState<TranslationItem | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const filtered = useMemo(() => {
    return mockTranslations.filter((t) => {
      const matchesSearch =
        !search ||
        t.contentTitle.toLowerCase().includes(search.toLowerCase()) ||
        t.contentPath.toLowerCase().includes(search.toLowerCase());
      const matchesLang =
        langFilter === "all" || t.targetLang === langFilter;
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesLang && matchesStatus;
    });
  }, [search, langFilter, statusFilter]);

  const statusCounts = {
    pending: mockTranslations.filter((t) => t.status === "pending").length,
    in_progress: mockTranslations.filter((t) => t.status === "in_progress").length,
    done: mockTranslations.filter((t) => t.status === "done").length,
    verified: mockTranslations.filter((t) => t.status === "verified").length,
  };

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
        {(Object.entries(statusCounts) as [TranslationStatus, number][]).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium capitalize text-gray-500">
                    {status.replace("_", " ")}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[status].className}`}
                >
                  {statusConfig[status].label}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
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
                placeholder="Search content title..."
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
                    {(["all", "pending", "in_progress", "done", "verified"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setStatusDropdownOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-sm ${
                          statusFilter === s
                            ? "bg-brand-50 font-medium text-brand-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {s === "all" ? "All Statuses" : statusConfig[s].label}
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
                  Translator
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
              {filtered.length === 0 ? (
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
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.contentTitle}</p>
                      <p className="text-xs text-gray-500">{item.contentPath}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-600">
                        {item.sourceLang}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase text-brand-700">
                        {item.targetLang}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusConfig[item.status].className
                        }`}
                      >
                        {statusConfig[item.status].label}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {item.translator ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-600">{item.translator}</span>
                          {item.translator === "AI Translation" && (
                            <Sparkles className="h-3 w-3 text-purple-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                      {item.updatedAt}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing 1-{filtered.length} of {filtered.length} translations
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

      {/* Side Panel */}
      {selectedItem && (
        <TranslationSidePanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Batch Translate Dialog */}
      <BatchTranslateDialog open={batchOpen} onClose={() => setBatchOpen(false)} />
    </div>
  );
}
