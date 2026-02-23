"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  Star,
  Flame,
  Download,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  Shield,
  Zap,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string;
  category: "COMPLETION" | "MASTERY" | "STREAK" | "SOCIAL" | "SPECIAL";
  earned: boolean;
  earnedAt: string | null;
  xpReward: number;
}

interface CertificateItem {
  id: string;
  issueNumber: string;
  courseName: string;
  templateName: string;
  pdfUrl: string | null;
  issuedAt: string;
  isValid: boolean;
}

interface AchievementsData {
  profile: {
    name: string;
    avatarUrl: string | null;
    totalXp: number;
    level: {
      level: number;
      currentXp: number;
      nextLevelXp: number | null;
      progress: number;
    };
    streak: {
      currentStreak: number;
      longestStreak: number;
    };
    rank: number | null;
  };
  badges: BadgeItem[];
  certificates: CertificateItem[];
  stats: {
    lessonsCompleted: number;
    quizzesPassed: number;
    tasksVerified: number;
    coursesCompleted: number;
  };
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

function AchievementsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading achievements">
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-3 w-48" />
          <SkeletonBlock className="h-2.5 w-full rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-20 rounded-xl" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ─── Category Icon ────────────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, React.ReactNode> = {
    COMPLETION: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
    MASTERY: <Star className="h-3.5 w-3.5" aria-hidden="true" />,
    STREAK: <Flame className="h-3.5 w-3.5" aria-hidden="true" />,
    SOCIAL: <Zap className="h-3.5 w-3.5" aria-hidden="true" />,
    SPECIAL: <Shield className="h-3.5 w-3.5" aria-hidden="true" />,
  };
  return <>{icons[category] || <Star className="h-3.5 w-3.5" aria-hidden="true" />}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
          color
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<string>("ALL");

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/v1/learner/achievements");
      if (!res.ok)
        throw new Error(`Failed to load achievements (${res.status})`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load achievements"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  if (loading) return <AchievementsSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-gray-500">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchAchievements}>
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { profile, badges, certificates, stats } = data;
  const xpProgressPct = Math.round(profile.level.progress * 100);

  // Badge categories for filter
  const categories = [
    "ALL",
    ...Array.from(new Set(badges.map((b) => b.category))),
  ];

  const filteredBadges =
    badgeFilter === "ALL"
      ? badges
      : badges.filter((b) => b.category === badgeFilter);

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6 pb-4">
      {/* Profile Summary */}
      <section
        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
        aria-labelledby="profile-heading"
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.name}'s avatar`}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600"
              aria-hidden="true"
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1
              id="profile-heading"
              className="text-lg font-bold text-gray-900"
            >
              {profile.name}
            </h1>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1 font-semibold text-brand-600">
                <Star className="h-3 w-3" aria-hidden="true" />
                {profile.totalXp.toLocaleString()} XP
              </span>
              <span>Level {profile.level.level}</span>
              {profile.streak.currentStreak > 0 && (
                <span className="flex items-center gap-0.5 text-orange-500">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {profile.streak.currentStreak}d
                </span>
              )}
              {profile.rank && (
                <span className="text-healthcare-purple">
                  #{profile.rank}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
            <span>Level {profile.level.level}</span>
            {profile.level.nextLevelXp && (
              <span>Level {profile.level.level + 1}</span>
            )}
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={xpProgressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`XP progress: ${xpProgressPct}% to next level`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
              style={{ width: `${xpProgressPct}%` }}
            />
          </div>
          {profile.level.nextLevelXp && (
            <p className="mt-1 text-center text-[10px] text-gray-400">
              {(
                profile.level.nextLevelXp - profile.level.currentXp
              ).toLocaleString()}{" "}
              XP to Level {profile.level.level + 1}
            </p>
          )}
        </div>
      </section>

      {/* Badges Section */}
      <section aria-labelledby="badges-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="badges-heading"
            className="text-sm font-semibold text-gray-900"
          >
            Badges
          </h2>
          <span className="text-xs text-gray-400">
            {earnedCount}/{badges.length} earned
          </span>
        </div>

        {/* Category Filter */}
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setBadgeFilter(cat)}
              className={cn(
                "flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
                badgeFilter === cat
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat !== "ALL" && <CategoryIcon category={cat} />}
              {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Badge Grid */}
        <div
          className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6"
          role="list"
          aria-label="Badge collection"
        >
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              role="listitem"
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                badge.earned
                  ? "border-gray-100 bg-white shadow-sm"
                  : "border-dashed border-gray-200 bg-gray-50 opacity-50"
              )}
              title={
                badge.earned
                  ? `${badge.name}: ${badge.description}. Earned ${new Date(badge.earnedAt!).toLocaleDateString()}`
                  : `${badge.name}: ${badge.description}. Not yet earned.`
              }
            >
              <div className="relative">
                {badge.earned ? (
                  <img
                    src={badge.iconUrl}
                    alt={badge.name}
                    className="h-10 w-10"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                    <Lock
                      className="h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                )}
                {badge.earned && (
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500">
                    <CheckCircle2
                      className="h-3 w-3 text-white"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>
              <span className="text-center text-[8px] font-medium leading-tight text-gray-600">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Certificates Section */}
      <section aria-labelledby="certificates-heading">
        <h2
          id="certificates-heading"
          className="mb-3 text-sm font-semibold text-gray-900"
        >
          Certificates
        </h2>
        {certificates.length > 0 ? (
          <div className="space-y-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    cert.isValid ? "bg-brand-50" : "bg-gray-100"
                  )}
                >
                  <Award
                    className={cn(
                      "h-5 w-5",
                      cert.isValid ? "text-brand-500" : "text-gray-400"
                    )}
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {cert.courseName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{cert.issueNumber}</span>
                    <span>
                      {new Date(cert.issuedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {!cert.isValid && (
                      <span className="font-semibold text-red-500">
                        Revoked
                      </span>
                    )}
                  </div>
                </div>
                {cert.pdfUrl && cert.isValid && (
                  <a
                    href={cert.pdfUrl}
                    download
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    aria-label={`Download certificate for ${cert.courseName}`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
            <Award
              className="mx-auto h-8 w-8 text-gray-300"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm text-gray-500">
              Complete courses to earn certificates
            </p>
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section aria-labelledby="stats-heading">
        <h2
          id="stats-heading"
          className="mb-3 text-sm font-semibold text-gray-900"
        >
          Learning Stats
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={
              <BookOpen className="h-5 w-5 text-brand-500" aria-hidden="true" />
            }
            label="Lessons Completed"
            value={stats.lessonsCompleted}
            color="bg-brand-50"
          />
          <StatCard
            icon={
              <HelpCircle
                className="h-5 w-5 text-healthcare-purple"
                aria-hidden="true"
              />
            }
            label="Quizzes Passed"
            value={stats.quizzesPassed}
            color="bg-purple-50"
          />
          <StatCard
            icon={
              <ClipboardCheck
                className="h-5 w-5 text-accent-500"
                aria-hidden="true"
              />
            }
            label="Tasks Verified"
            value={stats.tasksVerified}
            color="bg-accent-50"
          />
          <StatCard
            icon={
              <Trophy
                className="h-5 w-5 text-healthcare-amber"
                aria-hidden="true"
              />
            }
            label="Courses Completed"
            value={stats.coursesCompleted}
            color="bg-amber-50"
          />
        </div>
      </section>
    </div>
  );
}
