"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlossaryTerm {
  id: string;
  term: string;
  locale: string;
  definition: string;
  abbreviation: string | null;
  isVerified: boolean;
  specialty: string | null;
  translations: Array<{
    locale: string;
    term: string;
    definition: string;
  }>;
}

interface GlossaryResponse {
  terms: GlossaryTerm[];
  total: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

function GlossarySkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading glossary">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-14 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Alphabet Sidebar ─────────────────────────────────────────────────────────

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function AlphabetSidebar({
  activeLetters,
  onLetterClick,
  activeLetter,
}: {
  activeLetters: Set<string>;
  onLetterClick: (letter: string) => void;
  activeLetter: string | null;
}) {
  return (
    <nav
      className="fixed right-1 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-0 md:right-2"
      aria-label="Alphabet quick navigation"
    >
      {ALPHABET.map((letter) => (
        <button
          key={letter}
          onClick={() => {
            if (activeLetters.has(letter)) onLetterClick(letter);
          }}
          disabled={!activeLetters.has(letter)}
          className={cn(
            "flex h-5 w-5 items-center justify-center text-[9px] font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500",
            activeLetter === letter
              ? "rounded-full bg-brand-500 text-white"
              : activeLetters.has(letter)
                ? "text-gray-600 hover:text-brand-500"
                : "text-gray-200 cursor-default"
          )}
          aria-label={`Jump to ${letter}`}
        >
          {letter}
        </button>
      ))}
    </nav>
  );
}

// ─── Term Card ────────────────────────────────────────────────────────────────

function TermCard({
  term,
  t,
}: {
  term: GlossaryTerm;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
        aria-expanded={expanded}
        aria-controls={`term-${term.id}-details`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">
              {term.term}
            </h3>
            {term.abbreviation && (
              <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                {term.abbreviation}
              </span>
            )}
            {term.isVerified && (
              <span
                className="flex-shrink-0 text-accent-500"
                aria-label="Verified term"
                title="Verified by medical professional"
              >
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  <path d="M6 0L7.76 1.06L9.85 0.96L10.39 2.97L12 4.24L11.04 6.15L12 8.06L10.39 9.33L9.85 11.34L7.76 11.24L6 12.3L4.24 11.24L2.15 11.34L1.61 9.33L0 8.06L0.96 6.15L0 4.24L1.61 2.97L2.15 0.96L4.24 1.06L6 0Z" />
                  <path d="M4.5 6L5.5 7L7.5 5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
          {/* Preview translation */}
          {term.translations.length > 0 && !expanded && (
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {term.translations[0].term}
            </p>
          )}
          {term.specialty && (
            <span className="mt-1 inline-block rounded-full bg-healthcare-purple/10 px-2 py-0.5 text-[9px] font-medium text-healthcare-purple">
              {term.specialty}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp
            className="h-4 w-4 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
        )}
      </button>

      {expanded && (
        <div
          id={`term-${term.id}-details`}
          className="border-t border-gray-50 px-3 pb-3 pt-2 space-y-2"
        >
          {/* Definition */}
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase text-gray-400">
              {t("definition")}
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              {term.definition}
            </p>
          </div>

          {/* Translations */}
          {term.translations.length > 0 && (
            <div>
              <p className="mb-0.5 text-[10px] font-medium uppercase text-gray-400">
                {t("translations")}
              </p>
              <div className="space-y-1.5">
                {term.translations.map((trans) => (
                  <div
                    key={trans.locale}
                    className="rounded-lg bg-gray-50 px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brand-100 px-1 py-0.5 text-[9px] font-bold uppercase text-brand-600">
                        {trans.locale}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {trans.term}
                      </span>
                    </div>
                    {trans.definition && trans.definition !== term.definition && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {trans.definition}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function GlossaryPage() {
  const t = useTranslations("glossary");
  const tc = useTranslations("common");

  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const fetchGlossary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(
        `/api/v1/learner/glossary?${params.toString()}`
      );
      if (!res.ok) throw new Error(`Failed to load glossary (${res.status})`);
      const json: { data: GlossaryResponse } = await res.json();
      setTerms(json.data.terms);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load glossary"
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchGlossary();
  }, [fetchGlossary]);

  // Online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Group terms by first letter
  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    const sorted = [...terms].sort((a, b) =>
      a.term.localeCompare(b.term, undefined, { sensitivity: "base" })
    );

    for (const term of sorted) {
      const letter = term.term.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    }

    return groups;
  }, [terms]);

  const activeLetters = useMemo(
    () => new Set(Object.keys(groupedTerms)),
    [groupedTerms]
  );

  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    const el = letterRefs.current[letter];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-4 pb-4 pr-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t("title")}</h1>
        {!isOnline && (
          <div
            className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="h-3 w-3" aria-hidden="true" />
            {tc("offline")}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={t("searchTerms")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
          aria-label="Search medical terms"
        />
      </div>

      {/* Content */}
      {loading ? (
        <GlossarySkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchGlossary}>
            {tc("tryAgain")}
          </Button>
        </div>
      ) : terms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12">
          <BookOpen className="h-8 w-8 text-gray-300" aria-hidden="true" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {debouncedSearch
                ? t("noTermsFound")
                : t("noTermsAvailable")}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {debouncedSearch
                ? t("noTermsFoundDesc", { query: debouncedSearch })
                : t("noTermsAvailableDesc")}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Alphabet Sidebar */}
          <AlphabetSidebar
            activeLetters={activeLetters}
            onLetterClick={handleLetterClick}
            activeLetter={activeLetter}
          />

          {/* Grouped Term List */}
          <div className="space-y-6">
            {Object.entries(groupedTerms).map(([letter, letterTerms]) => (
              <div
                key={letter}
                ref={(el) => {
                  letterRefs.current[letter] = el;
                }}
              >
                {/* Letter Header */}
                <div className="sticky top-14 z-10 -mx-4 bg-gray-50 px-4 py-1">
                  <h2
                    className="text-xs font-bold text-brand-600"
                    id={`letter-${letter}`}
                  >
                    {letter}
                  </h2>
                </div>

                {/* Terms */}
                <div
                  className="mt-2 space-y-2"
                  role="list"
                  aria-labelledby={`letter-${letter}`}
                >
                  {letterTerms.map((term) => (
                    <div key={term.id} role="listitem">
                      <TermCard term={term} t={t} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Total count */}
          <p className="pt-2 text-center text-[10px] text-gray-400">
            {t("termsTotal", { count: terms.length })}
          </p>
        </>
      )}
    </div>
  );
}
