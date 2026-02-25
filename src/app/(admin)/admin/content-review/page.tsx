"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Send,
  Shield,
  FileText,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { csrfHeaders } from "@/lib/utils/csrf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewTab = "pending" | "approved" | "rejected";
type RiskLevel = "L1" | "L2" | "L3";

interface ReviewComment {
  id: string;
  comment: string;
  action: string;
  createdAt: string;
  reviewer?: { name: string };
}

interface ReviewItem {
  id: string;
  versionNumber: number;
  status: string;
  isAiGenerated: boolean;
  createdAt: string;
  lesson: {
    translations: { title: string; locale: string }[];
    module: {
      translations?: { title: string }[];
      course: {
        riskLevel: RiskLevel;
        translations: { title: string }[];
      };
    };
  };
  contentBody?: string;
  reviewComments: ReviewComment[];
  author?: { name: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const riskConfig: Record<RiskLevel, { label: string; className: string; required: number }> = {
  L1: { label: "L1 Low", className: "bg-green-50 text-green-700 border border-green-200", required: 1 },
  L2: { label: "L2 Medium", className: "bg-amber-50 text-amber-700 border border-amber-200", required: 2 },
  L3: { label: "L3 High", className: "bg-red-50 text-red-700 border border-red-200", required: 3 },
};

const tabConfig: { key: ReviewTab; label: string; apiStatus: string; icon: React.ElementType; color: string }[] = [
  { key: "pending", label: "Pending Review", apiStatus: "IN_REVIEW", icon: Clock, color: "text-amber-600" },
  { key: "approved", label: "Approved", apiStatus: "APPROVED", icon: CheckCircle2, color: "text-accent-600" },
  { key: "rejected", label: "Rejected", apiStatus: "ARCHIVED", icon: XCircle, color: "text-red-600" },
];

function getApprovalCount(comments: ReviewComment[]): number {
  return comments.filter((c) => c.action === "APPROVED" || c.action === "approved").length;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReviewCard({
  item,
  expanded,
  onToggle,
  onSubmitReview,
}: {
  item: ReviewItem;
  expanded: boolean;
  onToggle: () => void;
  onSubmitReview: (versionId: string, action: "approve" | "reject", reason?: string) => Promise<void>;
}) {
  const [reviewAction, setReviewAction] = useState<"approve" | "changes" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const riskLevel = item.lesson?.module?.course?.riskLevel || "L1";
  const risk = riskConfig[riskLevel];
  const courseTitle = item.lesson?.module?.course?.translations?.[0]?.title || "Untitled Course";
  const moduleTitle = item.lesson?.module?.translations?.[0]?.title || "Module";
  const lessonTitle = item.lesson?.translations?.[0]?.title || "Untitled Lesson";
  const approvalsReceived = getApprovalCount(item.reviewComments);
  const isPending = item.status === "IN_REVIEW" || item.status === "DRAFT";

  const handleSubmit = async () => {
    if (!reviewAction || reviewAction === "changes") return;
    setSubmitting(true);
    try {
      await onSubmitReview(
        item.id,
        reviewAction,
        comment.trim() || undefined
      );
      setReviewAction(null);
      setComment("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className={expanded ? "ring-2 ring-brand-200" : ""}>
      <CardContent className="p-0">
        {/* Card header */}
        <button
          onClick={onToggle}
          className="flex w-full items-start gap-4 p-4 text-left"
        >
          <div className="mt-0.5 shrink-0">
            {isPending ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : item.status === "APPROVED" || item.status === "PUBLISHED" ? (
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">{courseTitle}</span>
              <ChevronDown className="h-3 w-3 text-gray-300" />
              <span className="text-xs text-gray-500">{moduleTitle}</span>
              <ChevronDown className="h-3 w-3 text-gray-300" />
            </div>
            <h3 className="mt-1 text-sm font-semibold text-gray-900">{lessonTitle}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">
                v{item.versionNumber}
              </span>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-mono font-semibold ${risk.className}`}
              >
                {risk.label}
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
              {Array.from({ length: risk.required }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < approvalsReceived ? "bg-accent-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {approvalsReceived}/{risk.required} approvals
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
            {item.contentBody && (
              <div className="border-b border-gray-50 bg-gray-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Content Preview
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-700">{item.contentBody}</p>
              </div>
            )}

            {/* Existing comments */}
            {item.reviewComments.length > 0 && (
              <div className="border-b border-gray-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Review History
                </p>
                <div className="space-y-3">
                  {item.reviewComments.map((rc) => (
                    <div key={rc.id} className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {rc.action === "APPROVED" || rc.action === "approved" ? (
                          <CheckCircle2 className="h-4 w-4 text-accent-500" />
                        ) : rc.action === "REJECTED" || rc.action === "rejected" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {rc.reviewer?.name || "Reviewer"}
                          </span>
                          <span className={`text-xs font-medium capitalize ${
                            rc.action === "APPROVED" || rc.action === "approved" ? "text-accent-600" :
                            rc.action === "REJECTED" || rc.action === "rejected" ? "text-red-600" : "text-amber-600"
                          }`}>
                            {rc.action.toLowerCase().replace("_", " ")}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(rc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {rc.comment && (
                          <p className="mt-0.5 text-sm text-gray-600">{rc.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review form (only for pending items) */}
            {isPending && (
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
                    Comment {reviewAction === "reject" && <span className="text-red-500">*</span>}
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
                    Risk level <strong>{riskLevel}</strong> requires{" "}
                    <strong>{risk.required} approval{risk.required > 1 ? "s" : ""}</strong>.
                    Currently has {approvalsReceived}/{risk.required}.
                    {item.isAiGenerated && " AI-generated content always requires human review."}
                  </p>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <Button
                    disabled={
                      !reviewAction ||
                      reviewAction === "changes" ||
                      (reviewAction === "reject" && !comment.trim()) ||
                      submitting
                    }
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {submitting ? "Submitting..." : "Submit Review"}
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
  const [activeTab, setActiveTab] = useState<ReviewTab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentTabConfig = tabConfig.find((t) => t.key === activeTab)!;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: currentTabConfig.apiStatus,
      });

      const res = await fetch(`/api/v1/admin/content-review?${params.toString()}`);
      const json = await res.json();

      if (json.data) {
        setItems(json.data);
        setTotal(json.pagination?.total || 0);
      } else {
        setError("Failed to load reviews");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, currentTabConfig.apiStatus]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleTabChange = (tab: ReviewTab) => {
    setActiveTab(tab);
    setPage(1);
    setExpandedId(null);
  };

  const handleSubmitReview = async (versionId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const res = await fetch("/api/v1/admin/content-review", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ versionId, action, reason }),
      });

      if (res.ok) {
        // Refetch after successful review
        fetchReviews();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to submit review");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

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
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className={`h-4 w-4 ${activeTab === tab.key ? tab.color : "text-gray-400"}`} />
              {tab.label}
              {activeTab === tab.key && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Review items */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="mt-3 text-sm text-gray-500">Loading reviews...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <AlertTriangle className="h-10 w-10 text-red-300" />
              <p className="mt-3 text-sm font-medium text-gray-500">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchReviews()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
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
                  <p className="mt-3 text-sm font-medium text-gray-500">No approved items</p>
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
          items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
              onSubmitReview={handleSubmitReview}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} ({total} items)
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
    </div>
  );
}
