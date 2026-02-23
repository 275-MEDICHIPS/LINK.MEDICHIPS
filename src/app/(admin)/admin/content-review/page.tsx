"use client";

import { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  Shield,
  FileText,
  Eye,
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

type ReviewStatus = "pending" | "approved" | "rejected";
type RiskLevel = "L1" | "L2" | "L3";

interface ReviewItem {
  id: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  author: string;
  riskLevel: RiskLevel;
  isAiGenerated: boolean;
  status: ReviewStatus;
  submittedAt: string;
  approvalsRequired: number;
  approvalsReceived: number;
  content: string;
  reviewComments: { reviewer: string; comment: string; action: "approved" | "rejected" | "changes_requested"; date: string }[];
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockReviews: ReviewItem[] = [
  {
    id: "rev_001",
    courseTitle: "Emergency Triage Protocol",
    moduleTitle: "Introduction to Triage",
    lessonTitle: "What is Triage?",
    author: "Dr. Kim Seonghyun",
    riskLevel: "L3",
    isAiGenerated: false,
    status: "pending",
    submittedAt: "2026-02-23 14:30",
    approvalsRequired: 3,
    approvalsReceived: 1,
    content:
      "Triage is a process of prioritizing patients based on the severity of their condition. In emergency settings, effective triage ensures that limited resources are directed to those who need them most. The START (Simple Triage And Rapid Treatment) system is the most widely used method in mass casualty incidents.",
    reviewComments: [
      { reviewer: "Dr. Tanaka", comment: "Content is accurate. Approved from emergency medicine perspective.", action: "approved", date: "2026-02-24 09:00" },
    ],
  },
  {
    id: "rev_002",
    courseTitle: "Infection Prevention and Control",
    moduleTitle: "Hand Hygiene",
    lessonTitle: "5 Moments of Hand Hygiene",
    author: "AI Builder",
    riskLevel: "L2",
    isAiGenerated: true,
    status: "pending",
    submittedAt: "2026-02-22 10:15",
    approvalsRequired: 2,
    approvalsReceived: 0,
    content:
      "The WHO 5 moments for hand hygiene are: (1) before touching a patient, (2) before clean/aseptic procedures, (3) after body fluid exposure risk, (4) after touching a patient, and (5) after touching patient surroundings. Proper hand hygiene is the single most effective measure to prevent healthcare-associated infections.",
    reviewComments: [],
  },
  {
    id: "rev_003",
    courseTitle: "Wound Care Basics",
    moduleTitle: "Assessment",
    lessonTitle: "Wound Classification",
    author: "Nurse Mpho Dlamini",
    riskLevel: "L1",
    isAiGenerated: false,
    status: "pending",
    submittedAt: "2026-02-21 16:45",
    approvalsRequired: 1,
    approvalsReceived: 0,
    content:
      "Wounds can be classified by their cause (surgical, traumatic, pressure), depth (superficial, partial-thickness, full-thickness), and contamination level (clean, clean-contaminated, contaminated, dirty). Proper classification guides treatment decisions.",
    reviewComments: [],
  },
  {
    id: "rev_004",
    courseTitle: "Pediatric Assessment",
    moduleTitle: "Vital Signs",
    lessonTitle: "Age-Specific Normal Ranges",
    author: "AI Builder",
    riskLevel: "L3",
    isAiGenerated: true,
    status: "pending",
    submittedAt: "2026-02-20 11:30",
    approvalsRequired: 3,
    approvalsReceived: 0,
    content:
      "Normal vital sign ranges vary significantly by age in pediatric patients. Heart rate: newborn 120-160, infant 80-140, child 80-120, adolescent 60-100 bpm. Respiratory rate: newborn 30-60, infant 25-50, child 20-30, adolescent 12-20 breaths/min.",
    reviewComments: [],
  },
  {
    id: "rev_005",
    courseTitle: "Mental Health First Aid",
    moduleTitle: "Crisis Recognition",
    lessonTitle: "Signs of Acute Distress",
    author: "Dr. Williams Okafor",
    riskLevel: "L1",
    isAiGenerated: false,
    status: "pending",
    submittedAt: "2026-02-19 09:00",
    approvalsRequired: 1,
    approvalsReceived: 0,
    content:
      "Signs of acute psychological distress include rapid breathing, trembling, disorientation, emotional numbness, and inability to perform routine tasks. Early recognition allows for timely intervention and support.",
    reviewComments: [],
  },
  {
    id: "rev_006",
    courseTitle: "Diabetes Management",
    moduleTitle: "Monitoring",
    lessonTitle: "Blood Glucose Monitoring",
    author: "Dr. Chen Wei",
    riskLevel: "L2",
    isAiGenerated: false,
    status: "approved",
    submittedAt: "2026-02-18 14:00",
    approvalsRequired: 2,
    approvalsReceived: 2,
    content:
      "Blood glucose monitoring is essential for diabetes management. Normal fasting glucose: 70-100 mg/dL. Target pre-meal: 80-130 mg/dL. Target post-meal (2 hours): <180 mg/dL. HbA1c target: <7% for most adults.",
    reviewComments: [
      { reviewer: "Dr. Kim", comment: "Accurate values. Well structured.", action: "approved", date: "2026-02-19 10:00" },
      { reviewer: "Dr. Tanaka", comment: "Good for resource-limited context.", action: "approved", date: "2026-02-20 08:30" },
    ],
  },
  {
    id: "rev_007",
    courseTitle: "Infection Prevention and Control",
    moduleTitle: "PPE",
    lessonTitle: "Donning and Doffing Sequence",
    author: "AI Builder",
    riskLevel: "L2",
    isAiGenerated: true,
    status: "rejected",
    submittedAt: "2026-02-17 15:30",
    approvalsRequired: 2,
    approvalsReceived: 0,
    content:
      "Donning sequence: hand hygiene, gown, mask/respirator, goggles/face shield, gloves. Doffing sequence: gloves, goggles/face shield, gown, mask/respirator, hand hygiene.",
    reviewComments: [
      { reviewer: "Dr. Amina", comment: "Doffing sequence is incorrect per current WHO guidelines. The gown and gloves should be removed together. Please regenerate.", action: "rejected", date: "2026-02-18 11:00" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const riskConfig: Record<RiskLevel, { label: string; className: string; required: number }> = {
  L1: { label: "L1 Low", className: "bg-green-50 text-green-700 border border-green-200", required: 1 },
  L2: { label: "L2 Medium", className: "bg-amber-50 text-amber-700 border border-amber-200", required: 2 },
  L3: { label: "L3 High", className: "bg-red-50 text-red-700 border border-red-200", required: 3 },
};

const tabConfig: { key: ReviewStatus; label: string; icon: React.ElementType; color: string }[] = [
  { key: "pending", label: "Pending Review", icon: Clock, color: "text-amber-600" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-accent-600" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-red-600" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReviewCard({
  item,
  expanded,
  onToggle,
}: {
  item: ReviewItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [reviewAction, setReviewAction] = useState<"approve" | "changes" | "reject" | null>(null);
  const [comment, setComment] = useState("");

  return (
    <Card className={expanded ? "ring-2 ring-brand-200" : ""}>
      <CardContent className="p-0">
        {/* Card header */}
        <button
          onClick={onToggle}
          className="flex w-full items-start gap-4 p-4 text-left"
        >
          <div className="mt-0.5 shrink-0">
            {item.status === "pending" ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : item.status === "approved" ? (
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">{item.courseTitle}</span>
              <ChevronDown className="h-3 w-3 text-gray-300" />
              <span className="text-xs text-gray-500">{item.moduleTitle}</span>
              <ChevronDown className="h-3 w-3 text-gray-300" />
            </div>
            <h3 className="mt-1 text-sm font-semibold text-gray-900">{item.lessonTitle}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">by {item.author}</span>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${
                  riskConfig[item.riskLevel].className
                }`}
              >
                {riskConfig[item.riskLevel].label}
              </span>
              {item.isAiGenerated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                  <Sparkles className="h-3 w-3" /> AI Generated
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1">
              {Array.from({ length: item.approvalsRequired }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < item.approvalsReceived ? "bg-accent-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {item.approvalsReceived}/{item.approvalsRequired} approvals
            </p>
            {expanded ? (
              <ChevronUp className="ml-auto mt-1 h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="ml-auto mt-1 h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-gray-100">
            {/* Content preview */}
            <div className="border-b border-gray-50 bg-gray-50/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Content Preview
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{item.content}</p>
            </div>

            {/* Existing comments */}
            {item.reviewComments.length > 0 && (
              <div className="border-b border-gray-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Review History
                </p>
                <div className="space-y-3">
                  {item.reviewComments.map((rc, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {rc.action === "approved" ? (
                          <CheckCircle2 className="h-4 w-4 text-accent-500" />
                        ) : rc.action === "rejected" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{rc.reviewer}</span>
                          <span className={`text-xs font-medium capitalize ${
                            rc.action === "approved" ? "text-accent-600" :
                            rc.action === "rejected" ? "text-red-600" : "text-amber-600"
                          }`}>
                            {rc.action.replace("_", " ")}
                          </span>
                          <span className="text-xs text-gray-400">{rc.date}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-600">{rc.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review form (only for pending items) */}
            {item.status === "pending" && (
              <div className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Your Review
                </p>

                {/* Action buttons */}
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setReviewAction("approve")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      reviewAction === "approve"
                        ? "border-accent-300 bg-accent-50 text-accent-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setReviewAction("changes")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      reviewAction === "changes"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Request Changes
                  </button>
                  <button
                    onClick={() => setReviewAction("reject")}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      reviewAction === "reject"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>

                {/* Comment */}
                <div className="mb-4">
                  <label htmlFor={`comment-${item.id}`} className="mb-1.5 block text-sm font-medium text-gray-700">
                    Comment {reviewAction !== "approve" && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    id={`comment-${item.id}`}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder={
                      reviewAction === "approve"
                        ? "Optional comment..."
                        : "Explain what needs to be changed..."
                    }
                    className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  />
                </div>

                {/* Risk level notice */}
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-gray-50 p-3">
                  <Shield className="mt-0.5 h-4 w-4 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Risk level <strong>{item.riskLevel}</strong> requires{" "}
                    <strong>{item.approvalsRequired} approval{item.approvalsRequired > 1 ? "s" : ""}</strong>.
                    Currently has {item.approvalsReceived}/{item.approvalsRequired}.
                    {item.isAiGenerated && " AI-generated content always requires human review."}
                  </p>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <Button
                    disabled={!reviewAction || (reviewAction !== "approve" && !comment.trim())}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit Review
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContentReviewPage() {
  const [activeTab, setActiveTab] = useState<ReviewStatus>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return mockReviews.filter((r) => r.status === activeTab);
  }, [activeTab]);

  const counts = {
    pending: mockReviews.filter((r) => r.status === "pending").length,
    approved: mockReviews.filter((r) => r.status === "approved").length,
    rejected: mockReviews.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Review</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve medical content before publication. Risk level determines required approvals.
        </p>
      </div>

      {/* Risk level legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-gray-500">Approval Requirements:</span>
            {(["L1", "L2", "L3"] as const).map((level) => (
              <div key={level} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${
                    riskConfig[level].className
                  }`}
                >
                  {riskConfig[level].label}
                </span>
                <span className="text-xs text-gray-500">
                  {riskConfig[level].required} approval{riskConfig[level].required > 1 ? "s" : ""}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                <Sparkles className="h-3 w-3" /> AI
              </span>
              <span className="text-xs text-gray-500">Always requires human review</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabConfig.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(null);
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className={`h-4 w-4 ${activeTab === tab.key ? tab.color : "text-gray-400"}`} />
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeTab === tab.key ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Review items */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              {activeTab === "pending" ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-accent-200" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No pending reviews</p>
                  <p className="mt-1 text-xs text-gray-400">All caught up! Check back later.</p>
                </>
              ) : activeTab === "approved" ? (
                <>
                  <Eye className="h-12 w-12 text-gray-200" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No approved items yet</p>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-gray-200" />
                  <p className="mt-3 text-sm font-medium text-gray-500">No rejected items</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
