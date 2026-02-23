"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Scope = "ORGANIZATION" | "GLOBAL";
type TimeRange = "WEEK" | "MONTH" | "ALL_TIME";

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalXp: number;
  level: number;
  rank: number;
  streak: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  currentUserId: string;
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

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading leaderboard">
      {/* Podium skeleton */}
      <div className="flex items-end justify-center gap-4 py-6">
        <SkeletonBlock className="h-28 w-20 rounded-xl" />
        <SkeletonBlock className="h-36 w-20 rounded-xl" />
        <SkeletonBlock className="h-24 w-20 rounded-xl" />
      </div>
      {/* List skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-14 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: LeaderboardEntry[] }) {
  if (top3.length === 0) return null;

  // Reorder: [2nd, 1st, 3rd] for visual display
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = ["h-24", "h-32", "h-20"];
  const podiumColors = [
    "from-gray-200 to-gray-300", // Silver (2nd)
    "from-yellow-300 to-yellow-500", // Gold (1st)
    "from-amber-600 to-amber-700", // Bronze (3rd)
  ];
  const crownIcons = [
    <Medal key="silver" className="h-5 w-5 text-gray-400" aria-hidden="true" />,
    <Crown key="gold" className="h-5 w-5 text-yellow-500" aria-hidden="true" />,
    <Medal key="bronze" className="h-5 w-5 text-amber-600" aria-hidden="true" />,
  ];
  const rankLabels = ["2nd", "1st", "3rd"];

  return (
    <div
      className="flex items-end justify-center gap-3 px-4 py-6"
      role="img"
      aria-label={`Top 3: 1st ${top3[0]?.name ?? "N/A"}, 2nd ${top3[1]?.name ?? "N/A"}, 3rd ${top3[2]?.name ?? "N/A"}`}
    >
      {ordered.map((entry, i) => {
        if (!entry) return <div key={i} className="w-20" />;
        return (
          <div
            key={entry.userId}
            className={cn(
              "flex flex-col items-center",
              i === 1 && "-mt-4"
            )}
          >
            {/* Avatar + Crown */}
            <div className="relative mb-2">
              {i === 1 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  {crownIcons[i]}
                </div>
              )}
              {entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt={entry.name}
                  className={cn(
                    "rounded-full object-cover border-2",
                    i === 1
                      ? "h-14 w-14 border-yellow-400"
                      : "h-11 w-11 border-gray-200"
                  )}
                />
              ) : (
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 font-bold text-white",
                    i === 1
                      ? "h-14 w-14 border-yellow-400 bg-brand-500 text-lg"
                      : "h-11 w-11 border-gray-200 bg-brand-400 text-sm"
                  )}
                >
                  {entry.name.charAt(0).toUpperCase()}
                </div>
              )}
              {entry.isCurrentUser && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-1.5 py-0.5 text-[7px] font-bold text-white">
                  You
                </div>
              )}
            </div>

            {/* Name & XP */}
            <p
              className={cn(
                "max-w-[72px] truncate text-center text-xs font-semibold",
                entry.isCurrentUser ? "text-brand-600" : "text-gray-900"
              )}
            >
              {entry.name.split(" ")[0]}
            </p>
            <p className="text-[10px] text-gray-400">
              {entry.totalXp.toLocaleString()} XP
            </p>

            {/* Podium Bar */}
            <div
              className={cn(
                "mt-2 w-20 rounded-t-xl bg-gradient-to-t",
                podiumHeights[i],
                podiumColors[i]
              )}
            >
              <div className="flex h-full flex-col items-center justify-start pt-2">
                {crownIcons[i]}
                <span className="mt-1 text-xs font-bold text-white/90">
                  {rankLabels[i]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        entry.isCurrentUser
          ? "border-brand-200 bg-brand-50"
          : "border-gray-100 bg-white"
      )}
    >
      {/* Rank */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
        <span
          className={cn(
            "text-sm font-bold",
            entry.rank <= 3 ? "text-brand-600" : "text-gray-400"
          )}
        >
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.name}
          className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
          {entry.name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name & Level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "truncate text-sm font-medium",
              entry.isCurrentUser ? "text-brand-700" : "text-gray-900"
            )}
          >
            {entry.name}
            {entry.isCurrentUser && (
              <span className="ml-1 text-[10px] font-bold text-brand-500">
                (You)
              </span>
            )}
          </p>
        </div>
        <p className="text-[10px] text-gray-400">Level {entry.level}</p>
      </div>

      {/* XP & Streak */}
      <div className="flex flex-col items-end">
        <p className="text-sm font-semibold text-gray-900">
          {entry.totalXp.toLocaleString()}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>XP</span>
          {entry.streak > 0 && (
            <span className="flex items-center gap-0.5 text-orange-500">
              <Flame className="h-2.5 w-2.5" aria-hidden="true" />
              {entry.streak}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("ORGANIZATION");
  const [timeRange, setTimeRange] = useState<TimeRange>("WEEK");

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        scope,
        timeRange,
      });
      const res = await fetch(
        `/api/v1/learner/leaderboard?${params.toString()}`
      );
      if (!res.ok)
        throw new Error(`Failed to load leaderboard (${res.status})`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard"
      );
    } finally {
      setLoading(false);
    }
  }, [scope, timeRange]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const top3 = data?.entries.slice(0, 3) ?? [];
  const restEntries = data?.entries.slice(3) ?? [];

  // Check if current user is visible in the list
  const currentUserVisible = data?.entries.some((e) => e.isCurrentUser) ?? false;
  const currentUserEntry = data?.entries.find((e) => e.isCurrentUser);

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Leaderboard</h1>
        <Trophy
          className="h-5 w-5 text-healthcare-amber"
          aria-hidden="true"
        />
      </div>

      {/* Scope Toggle */}
      <div
        className="flex gap-1 rounded-xl bg-gray-100 p-1"
        role="tablist"
        aria-label="Leaderboard scope"
      >
        {(
          [
            { label: "Organization", value: "ORGANIZATION" as Scope },
            { label: "Global", value: "GLOBAL" as Scope },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={scope === item.value}
            onClick={() => setScope(item.value)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
              scope === item.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Time Range Filter */}
      <div
        className="flex gap-2"
        role="tablist"
        aria-label="Time range filter"
      >
        {(
          [
            { label: "This Week", value: "WEEK" as TimeRange },
            { label: "This Month", value: "MONTH" as TimeRange },
            { label: "All Time", value: "ALL_TIME" as TimeRange },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={timeRange === item.value}
            onClick={() => setTimeRange(item.value)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-[10px] font-medium transition-colors",
              timeRange === item.value
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LeaderboardSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-gray-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchLeaderboard}>
            Try again
          </Button>
        </div>
      ) : data && data.entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12">
          <Trophy className="h-8 w-8 text-gray-300" aria-hidden="true" />
          <p className="text-sm text-gray-500">
            No leaderboard data yet. Start learning to appear on the board!
          </p>
        </div>
      ) : (
        data && (
          <>
            {/* Podium */}
            <Podium top3={top3} />

            {/* Scrollable List (rank 4+) */}
            {restEntries.length > 0 && (
              <div
                className="space-y-2"
                role="list"
                aria-label="Leaderboard rankings"
              >
                {restEntries.map((entry) => (
                  <div key={entry.userId} role="listitem">
                    <LeaderboardRow entry={entry} />
                  </div>
                ))}
              </div>
            )}

            {/* Current User (if not visible in list) */}
            {!currentUserVisible && data.currentUserRank && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-center text-[10px] font-medium text-gray-400">
                  Your Ranking
                </p>
                {currentUserEntry ? (
                  <LeaderboardRow entry={currentUserEntry} />
                ) : (
                  <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-brand-700">
                      #{data.currentUserRank}
                    </p>
                    <p className="text-[10px] text-brand-500">
                      Keep learning to climb the ranks!
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
