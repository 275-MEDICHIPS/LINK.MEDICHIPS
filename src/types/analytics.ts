// ---------------------------------------------------------------------------
// Analytics & reporting types for MEDICHIPS-LINK
// ---------------------------------------------------------------------------

/** Report types available in the system */
export type ReportType = "PROGRESS" | "COMPETENCY" | "ATTENDANCE" | "IMPACT";

/** Time granularity for metrics */
export type TimeGranularity = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY";

/** Report schedule frequency */
export type ScheduleFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

/** Report export format */
export type ExportFormat = "CSV" | "PDF" | "XLSX";

// ---------------------------------------------------------------------------
// Dashboard types
// ---------------------------------------------------------------------------

export interface OperationalDashboard {
  /** High-level summary stats */
  summary: DashboardSummary;
  /** Daily activity metrics for charts */
  dailyMetrics: DailyMetric[];
  /** Per-course analytics */
  courseAnalytics: CourseAnalytics[];
  /** Active user trend */
  activeUserTrend: TrendPoint[];
  /** Recent alerts / anomalies */
  alerts: DashboardAlert[];
  generatedAt: string;
}

export interface DashboardSummary {
  totalLearners: number;
  activeLearners: number;
  totalCourses: number;
  averageCompletion: number;
  averageQuizScore: number;
  totalTasksCompleted: number;
  pendingVerifications: number;
  totalXpAwarded: number;
  /** Week-over-week change percentages */
  changes: {
    learners: number;
    completion: number;
    quizScore: number;
    tasks: number;
  };
}

export interface ImpactDashboard {
  /** KOICA-specific impact metrics */
  koicaMetrics: KoicaMetrics;
  /** Cost analysis */
  costAnalysis: CostAnalysis;
  /** Outcome measurements */
  outcomes: OutcomeRecord[];
  /** Comparison with baseline */
  baselineComparison: BaselineComparison;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface DailyMetric {
  date: string;
  activeUsers: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  quizPassRate: number;
  tasksSubmitted: number;
  tasksVerified: number;
  averageSessionMinutes: number;
  xpAwarded: number;
  newEnrollments: number;
}

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  enrollmentCount: number;
  completionRate: number;
  averageScore: number;
  averageTimeMinutes: number;
  dropOffModule: string | null;
  /** Module-level completion rates */
  moduleCompletion: {
    moduleId: string;
    moduleTitle: string;
    completionRate: number;
  }[];
  /** Top difficulty questions */
  hardestQuestions: {
    questionId: string;
    prompt: string;
    failRate: number;
  }[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface DashboardAlert {
  id: string;
  type: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  /** Entity reference */
  entityType?: string;
  entityId?: string;
  createdAt: string;
  dismissed: boolean;
}

// ---------------------------------------------------------------------------
// KOICA reporting
// ---------------------------------------------------------------------------

export interface KoicaReport {
  id: string;
  reportPeriod: string;
  programName: string;
  /** Country / region */
  region: string;
  generatedAt: string;
  generatedBy: string;
  metrics: KoicaMetrics;
  costRecords: CostRecord[];
  outcomeRecords: OutcomeRecord[];
  narrative: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
}

export interface KoicaMetrics {
  totalBeneficiaries: number;
  activeBeneficiaries: number;
  completionRate: number;
  /** Knowledge gain pre/post */
  knowledgeGainPercent: number;
  /** Skills assessed as competent */
  competencyRate: number;
  /** Satisfaction survey average (1-5) */
  satisfactionScore: number;
  /** Cost per beneficiary */
  costPerBeneficiary: number;
  /** Training hours delivered */
  totalTrainingHours: number;
  /** Number of certified learners */
  certifiedLearners: number;
}

export interface CostRecord {
  id: string;
  category: CostCategory;
  description: string;
  amount: number;
  currency: string;
  date: string;
  /** Supporting document URL */
  receiptUrl?: string;
}

export type CostCategory =
  | "PERSONNEL"
  | "TECHNOLOGY"
  | "CONTENT_DEVELOPMENT"
  | "TRAINING_DELIVERY"
  | "TRAVEL"
  | "EQUIPMENT"
  | "OVERHEAD"
  | "OTHER";

export interface OutcomeRecord {
  id: string;
  indicator: string;
  baseline: number;
  target: number;
  actual: number;
  unit: string;
  period: string;
  /** Whether the target was achieved */
  achieved: boolean;
  notes?: string;
}

export interface BaselineComparison {
  preTrainingScores: { category: string; score: number }[];
  postTrainingScores: { category: string; score: number }[];
  overallImprovement: number;
}

export interface CostAnalysis {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  costPerLearner: number;
  costPerCompletedCourse: number;
  categoryBreakdown: { category: CostCategory; amount: number; percent: number }[];
}

// ---------------------------------------------------------------------------
// Report generation & scheduling
// ---------------------------------------------------------------------------

export interface ReportRequest {
  type: ReportType;
  programId?: string;
  dateFrom: string;
  dateTo: string;
  format: ExportFormat;
  filters?: ReportFilters;
}

export interface ReportFilters {
  courseIds?: string[];
  learnerIds?: string[];
  supervisorIds?: string[];
  region?: string;
  tags?: string[];
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  dateFrom: string;
  dateTo: string;
  /** Summary statistics for display */
  summary: ReportSummaryStats;
  /** Rows of data for the report table */
  rows: ReportRow[];
  generatedAt: string;
  downloadUrl?: string;
}

export interface ReportSummaryStats {
  totalLearners: number;
  averageCompletion: number;
  averageScore: number;
  totalHours: number;
  certificatesIssued: number;
  /** Additional stats depending on report type */
  extra: Record<string, number | string>;
}

export interface ReportRow {
  learnerId: string;
  learnerName: string;
  program: string;
  progressPercent: number;
  averageScore: number;
  hoursSpent: number;
  tasksCompleted: number;
  lastActiveAt: string | null;
  status: string;
  /** Additional columns depending on report type */
  extra: Record<string, unknown>;
}

export interface ReportSchedule {
  id: string;
  type: ReportType;
  frequency: ScheduleFrequency;
  programId: string;
  recipients: string[];
  format: ExportFormat;
  filters?: ReportFilters;
  nextRunAt: string;
  lastRunAt?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
}
