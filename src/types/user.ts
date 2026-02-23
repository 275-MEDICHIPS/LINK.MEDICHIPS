// ---------------------------------------------------------------------------
// User & auth types for MEDICHIPS-LINK
// ---------------------------------------------------------------------------

/** User roles within the platform */
export type UserRole =
  | "LEARNER"
  | "SUPERVISOR"
  | "ADMIN"
  | "ORG_ADMIN"
  | "CONTENT_CREATOR"
  | "SUPER_ADMIN";

/** Supported authentication methods */
export type AuthMethod = "PIN" | "EMAIL_PASSWORD" | "GOOGLE_OAUTH" | "INVITE_CODE";

/** Account status */
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "DEACTIVATED";

// ---------------------------------------------------------------------------
// Core user
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  orgId: string;
  avatarUrl?: string;
  locale: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  bio?: string;
  specialty?: string;
  yearsExperience?: number;
  organization: OrganizationMembership;
  /** Learner-specific fields */
  xpTotal?: number;
  currentStreak?: number;
  longestStreak?: number;
  badgeCount?: number;
  certificateCount?: number;
  enrolledCourseCount?: number;
  completedCourseCount?: number;
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export interface OrganizationMembership {
  orgId: string;
  orgName: string;
  orgLogoUrl?: string;
  role: UserRole;
  joinedAt: string;
  /** KOICA partner identifier if applicable */
  koicaPartnerId?: string;
}

// ---------------------------------------------------------------------------
// Auth request / response
// ---------------------------------------------------------------------------

export interface LoginRequest {
  method: AuthMethod;
  /** For PIN auth */
  pin?: string;
  /** For email/password auth */
  email?: string;
  password?: string;
  /** For OAuth */
  oauthToken?: string;
  /** For invite code */
  inviteCode?: string;
  /** Device fingerprint for session tracking */
  deviceId?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresAt: string;
}

export interface RegisterRequest {
  name: string;
  email?: string;
  phone?: string;
  pin: string;
  locale: string;
  orgId: string;
  inviteCode?: string;
  specialty?: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Supervisor-specific types
// ---------------------------------------------------------------------------

export interface SupervisorLearner {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  program: string;
  progressPercent: number;
  lastActiveAt: string | null;
  currentStreak: number;
  enrolledCourses: number;
  completedCourses: number;
  pendingTasks: number;
  riskFlags: RiskFlag[];
}

export type RiskFlagType =
  | "INACTIVE"
  | "LOW_PROGRESS"
  | "FAILING_QUIZZES"
  | "OVERDUE_TASKS"
  | "STREAK_BROKEN";

export interface RiskFlag {
  type: RiskFlagType;
  severity: "low" | "medium" | "high";
  message: string;
  since: string;
}

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export interface InviteCode {
  code: string;
  orgId: string;
  role: UserRole;
  createdBy: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  maxUses: number;
  useCount: number;
}
