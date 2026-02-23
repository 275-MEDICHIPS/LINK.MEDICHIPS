// ---------------------------------------------------------------------------
// Gamification types for MEDICHIPS-LINK
// ---------------------------------------------------------------------------

/** XP source action */
export type XpAction =
  | "LESSON_COMPLETE"
  | "QUIZ_PASS"
  | "QUIZ_PERFECT"
  | "TASK_COMPLETE"
  | "STREAK_BONUS"
  | "FIRST_LOGIN"
  | "COURSE_COMPLETE"
  | "PEER_HELP"
  | "DAILY_GOAL"
  | "BADGE_BONUS";

/** Badge rarity tier */
export type BadgeRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

/** Badge category */
export type BadgeCategory =
  | "PROGRESS"
  | "MASTERY"
  | "CONSISTENCY"
  | "SOCIAL"
  | "SPECIAL"
  | "COMPLETION";

/** Leaderboard time scope */
export type LeaderboardScope = "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

export interface XpProfile {
  userId: string;
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  /** XP earned today */
  todayXp: number;
  /** XP earned this week */
  weekXp: number;
  rank: number;
  /** Recent XP entries for activity feed */
  recentEntries: XpEntry[];
}

export interface XpEntry {
  id: string;
  userId: string;
  action: XpAction;
  amount: number;
  /** Reference to the entity that triggered the XP */
  referenceId: string;
  referenceType: string;
  description: string;
  /** Idempotency key to prevent duplicate XP */
  idempotencyKey: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  /** Criteria to earn this badge */
  criteria: BadgeCriteria;
  xpBonus: number;
  createdAt: string;
}

export interface BadgeCriteria {
  type: string;
  /** Threshold value (e.g., 10 for "complete 10 lessons") */
  threshold: number;
  /** Additional conditions */
  conditions?: Record<string, unknown>;
}

export interface EarnedBadge {
  id: string;
  userId: string;
  badgeId: string;
  badge: Badge;
  earnedAt: string;
  /** Whether the user has viewed the badge notification */
  seen: boolean;
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export interface Streak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  /** Calendar of active days this month */
  activeDays: string[];
  /** Whether today's streak is secured */
  todayCompleted: boolean;
  /** Minutes until streak deadline */
  minutesUntilDeadline: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  streak: number;
  badgeCount: number;
  /** Change in rank since last period */
  rankChange: number;
}

export interface Leaderboard {
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  /** Current user's position */
  currentUserRank: number;
  totalParticipants: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  templateUrl: string;
  issuerName: string;
  issuerTitle: string;
  /** Certificate validity in months (null = permanent) */
  validityMonths: number | null;
  createdAt: string;
}

export interface IssuedCertificate {
  id: string;
  certificateId: string;
  certificate: Certificate;
  userId: string;
  userName: string;
  /** Unique issue number for verification */
  issueNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  /** Public verification URL */
  verificationUrl: string;
  /** Generated PDF URL */
  pdfUrl: string;
  /** QR code data URL */
  qrCodeUrl: string;
  revoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
}
