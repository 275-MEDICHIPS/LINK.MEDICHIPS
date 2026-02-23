"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Video,
  MapPin,
  Bot,
  FileText,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskEvidence {
  id: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  thumbnailUrl: string;
  fileName: string;
  fileSizeMB: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

interface GpsData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  learnerName: string;
  learnerAvatarUrl?: string;
  submittedAt: string;
  status: "SUBMITTED" | "VERIFIED" | "REJECTED";
  evidence: TaskEvidence[];
  checklist: ChecklistItem[];
  gpsData?: GpsData;
  aiScore?: number;
  feedback?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_SUBMISSIONS: TaskSubmission[] = [
  {
    id: "ts1",
    taskId: "t1",
    taskTitle: "Blood Pressure Measurement",
    learnerName: "Amina Yusuf",
    submittedAt: "2026-02-24T09:15:00Z",
    status: "SUBMITTED",
    evidence: [
      {
        id: "e1",
        type: "IMAGE",
        thumbnailUrl: "/placeholder-evidence-1.jpg",
        fileName: "bp-reading.jpg",
        fileSizeMB: 1.2,
      },
      {
        id: "e2",
        type: "IMAGE",
        thumbnailUrl: "/placeholder-evidence-2.jpg",
        fileName: "patient-consent.jpg",
        fileSizeMB: 0.8,
      },
    ],
    checklist: [
      { id: "cl1", label: "Verified patient identity", completed: true, required: true },
      { id: "cl2", label: "Used correct cuff size", completed: true, required: true },
      { id: "cl3", label: "Recorded systolic and diastolic values", completed: true, required: true },
      { id: "cl4", label: "Informed patient of results", completed: false, required: false },
    ],
    gpsData: {
      latitude: -1.9403,
      longitude: 29.8739,
      accuracy: 15,
      address: "Kigali Health Center, Kigali, Rwanda",
    },
    aiScore: 87,
  },
  {
    id: "ts2",
    taskId: "t2",
    taskTitle: "Patient History Taking",
    learnerName: "Samuel Okonkwo",
    submittedAt: "2026-02-24T08:30:00Z",
    status: "SUBMITTED",
    evidence: [
      {
        id: "e3",
        type: "DOCUMENT",
        thumbnailUrl: "/placeholder-doc.jpg",
        fileName: "patient-history-form.pdf",
        fileSizeMB: 0.3,
      },
    ],
    checklist: [
      { id: "cl5", label: "Obtained chief complaint", completed: true, required: true },
      { id: "cl6", label: "Reviewed medical history", completed: true, required: true },
      { id: "cl7", label: "Documented allergies", completed: true, required: true },
      { id: "cl8", label: "Recorded family history", completed: false, required: true },
    ],
    aiScore: 72,
  },
  {
    id: "ts3",
    taskId: "t3",
    taskTitle: "Sterile Technique Practice",
    learnerName: "Ibrahim Keita",
    submittedAt: "2026-02-23T16:45:00Z",
    status: "SUBMITTED",
    evidence: [
      {
        id: "e4",
        type: "VIDEO",
        thumbnailUrl: "/placeholder-video.jpg",
        fileName: "sterile-technique.mp4",
        fileSizeMB: 24.5,
      },
      {
        id: "e5",
        type: "IMAGE",
        thumbnailUrl: "/placeholder-evidence-3.jpg",
        fileName: "sterile-field.jpg",
        fileSizeMB: 1.5,
      },
      {
        id: "e6",
        type: "IMAGE",
        thumbnailUrl: "/placeholder-evidence-4.jpg",
        fileName: "glove-technique.jpg",
        fileSizeMB: 1.1,
      },
    ],
    checklist: [
      { id: "cl9", label: "Performed hand hygiene", completed: true, required: true },
      { id: "cl10", label: "Opened sterile package correctly", completed: true, required: true },
      { id: "cl11", label: "Maintained sterile field", completed: true, required: true },
      { id: "cl12", label: "Applied sterile gloves correctly", completed: true, required: true },
    ],
    gpsData: {
      latitude: -1.9536,
      longitude: 29.8894,
      accuracy: 8,
      address: "University Teaching Hospital, Kigali, Rwanda",
    },
    aiScore: 94,
  },
  {
    id: "ts4",
    taskId: "t4",
    taskTitle: "Hand Hygiene Procedure",
    learnerName: "Jean-Pierre Habimana",
    submittedAt: "2026-02-22T14:00:00Z",
    status: "VERIFIED",
    evidence: [
      {
        id: "e7",
        type: "VIDEO",
        thumbnailUrl: "/placeholder-video-2.jpg",
        fileName: "hand-hygiene.mp4",
        fileSizeMB: 12.3,
      },
    ],
    checklist: [
      { id: "cl13", label: "Used soap and water", completed: true, required: true },
      { id: "cl14", label: "Scrubbed for 20+ seconds", completed: true, required: true },
      { id: "cl15", label: "Covered all surfaces", completed: true, required: true },
    ],
    feedback: "Excellent technique demonstrated. All steps followed correctly.",
    aiScore: 96,
  },
  {
    id: "ts5",
    taskId: "t5",
    taskTitle: "Wound Assessment",
    learnerName: "Grace Mutoni",
    submittedAt: "2026-02-21T10:00:00Z",
    status: "REJECTED",
    evidence: [
      {
        id: "e8",
        type: "IMAGE",
        thumbnailUrl: "/placeholder-evidence-5.jpg",
        fileName: "wound-photo.jpg",
        fileSizeMB: 2.1,
      },
    ],
    checklist: [
      { id: "cl16", label: "Documented wound location", completed: true, required: true },
      { id: "cl17", label: "Measured wound dimensions", completed: false, required: true },
      { id: "cl18", label: "Assessed wound bed", completed: false, required: true },
    ],
    feedback:
      "Wound dimensions were not measured. Please retake with a ruler visible in the photo and document size in the notes.",
    aiScore: 38,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function evidenceIcon(type: string) {
  switch (type) {
    case "VIDEO":
      return Video;
    case "DOCUMENT":
      return FileText;
    default:
      return ImageIcon;
  }
}

function aiScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50";
  if (score >= 60) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SupervisorTasksPage() {
  const [tab, setTab] = useState("SUBMITTED");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewChecklist, setReviewChecklist] = useState<
    Record<string, boolean>
  >({});
  const [feedback, setFeedback] = useState("");
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceViewerUrl, setEvidenceViewerUrl] = useState<string | null>(null);

  // Read initial selection from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("submission");
    if (sid) {
      setSelectedId(sid);
      // Find and set correct tab
      const found = MOCK_SUBMISSIONS.find((s) => s.id === sid);
      if (found) setTab(found.status);
    }
  }, []);

  // Filter by tab
  const filteredSubmissions = useMemo(
    () => MOCK_SUBMISSIONS.filter((s) => s.status === tab),
    [tab]
  );

  // Selected submission
  const selected = useMemo(
    () => MOCK_SUBMISSIONS.find((s) => s.id === selectedId) ?? null,
    [selectedId]
  );

  // Initialize review checklist when selection changes
  useEffect(() => {
    if (selected) {
      const initial: Record<string, boolean> = {};
      selected.checklist.forEach((item) => {
        initial[item.id] = item.completed;
      });
      setReviewChecklist(initial);
      setFeedback(selected.feedback ?? "");
      setSignature("");
    }
  }, [selected]);

  // Handle approve/reject
  const handleVerify = useCallback(
    async (_result: "APPROVED" | "REJECTED") => {
      if (!selected) return;
      setIsSubmitting(true);

      try {
        // In production:
        // await fetch(`/api/v1/tasks/${selected.taskId}/verify`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     submissionId: selected.id,
        //     result,
        //     feedback,
        //     checklistVerification: Object.entries(reviewChecklist).map(
        //       ([id, verified]) => ({ checklistItemId: id, verified })
        //     ),
        //     digitalSignature: signature || undefined,
        //   }),
        // });

        await new Promise((r) => setTimeout(r, 500));
        // After success, clear selection
        setSelectedId(null);
        setFeedback("");
        setSignature("");
      } catch {
        // Error handling
      } finally {
        setIsSubmitting(false);
      }
    },
    [selected, feedback, reviewChecklist, signature]
  );

  // Counts for tab badges
  const counts = useMemo(() => {
    const c = { SUBMITTED: 0, VERIFIED: 0, REJECTED: 0 };
    for (const s of MOCK_SUBMISSIONS) {
      c[s.status]++;
    }
    return c;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Task Review</h1>
        <p className="text-gray-500">
          Review task submissions, verify evidence, and provide feedback
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="SUBMITTED" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Needs Verification
            {counts.SUBMITTED > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {counts.SUBMITTED}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="VERIFIED" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
            <span className="ml-1 text-xs text-gray-400">
              {counts.VERIFIED}
            </span>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
            <span className="ml-1 text-xs text-gray-400">
              {counts.REJECTED}
            </span>
          </TabsTrigger>
        </TabsList>

        {["SUBMITTED", "VERIFIED", "REJECTED"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Submission cards list */}
              <div className={cn(selected ? "lg:col-span-1" : "lg:col-span-3")}>
                <div
                  className={cn(
                    "grid gap-3",
                    !selected && "sm:grid-cols-2 lg:grid-cols-3"
                  )}
                  role="list"
                  aria-label="Task submissions"
                >
                  {filteredSubmissions.length === 0 && (
                    <div className="col-span-full rounded-xl border border-gray-100 bg-white p-12 text-center">
                      <p className="text-sm text-gray-500">
                        No submissions in this category.
                      </p>
                    </div>
                  )}
                  {filteredSubmissions.map((sub) => (
                    <Card
                      key={sub.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-accent-200 hover:shadow-md",
                        selectedId === sub.id && "border-accent-400 ring-1 ring-accent-400"
                      )}
                      onClick={() =>
                        setSelectedId(selectedId === sub.id ? null : sub.id)
                      }
                      role="article"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(
                            selectedId === sub.id ? null : sub.id
                          );
                        }
                      }}
                      aria-current={selectedId === sub.id ? "true" : undefined}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            {sub.learnerAvatarUrl && (
                              <AvatarImage
                                src={sub.learnerAvatarUrl}
                                alt={sub.learnerName}
                              />
                            )}
                            <AvatarFallback className="bg-accent-100 text-xs text-accent-700">
                              {getInitials(sub.learnerName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {sub.taskTitle}
                            </p>
                            <p className="text-xs text-gray-500">
                              {sub.learnerName}
                            </p>
                          </div>
                          {sub.aiScore !== undefined && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                                aiScoreColor(sub.aiScore)
                              )}
                              title="AI verification score"
                            >
                              AI: {sub.aiScore}%
                            </span>
                          )}
                        </div>

                        {/* Evidence thumbnails */}
                        <div className="mt-3 flex gap-2">
                          {sub.evidence.slice(0, 3).map((ev) => {
                            const Icon = evidenceIcon(ev.type);
                            return (
                              <div
                                key={ev.id}
                                className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100"
                                title={ev.fileName}
                              >
                                <Icon className="h-5 w-5 text-gray-500" />
                              </div>
                            );
                          })}
                          {sub.evidence.length > 3 && (
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
                              +{sub.evidence.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Checklist summary */}
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {sub.checklist.filter((c) => c.completed).length}/
                            {sub.checklist.length} checklist items
                          </span>
                          <span>{formatDate(sub.submittedAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Review panel */}
              {selected && (
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-lg">
                        Review: {selected.taskTitle}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close review panel"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Learner info */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {selected.learnerAvatarUrl && (
                            <AvatarImage
                              src={selected.learnerAvatarUrl}
                              alt={selected.learnerName}
                            />
                          )}
                          <AvatarFallback className="bg-accent-100 text-sm text-accent-700">
                            {getInitials(selected.learnerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {selected.learnerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Submitted {formatDate(selected.submittedAt)}
                          </p>
                        </div>
                        {selected.aiScore !== undefined && (
                          <div
                            className={cn(
                              "ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5",
                              aiScoreColor(selected.aiScore)
                            )}
                          >
                            <Bot className="h-4 w-4" />
                            <span className="text-sm font-semibold">
                              AI Score: {selected.aiScore}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Evidence viewer */}
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">
                          Evidence ({selected.evidence.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {selected.evidence.map((ev) => {
                            const Icon = evidenceIcon(ev.type);
                            return (
                              <button
                                key={ev.id}
                                onClick={() =>
                                  setEvidenceViewerUrl(ev.thumbnailUrl)
                                }
                                className="group relative flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-accent-300 hover:bg-accent-50"
                                aria-label={`View ${ev.fileName}`}
                              >
                                <Icon className="h-8 w-8 text-gray-400 group-hover:text-accent-600" />
                                <p className="mt-2 max-w-full truncate text-xs text-gray-600">
                                  {ev.fileName}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {ev.fileSizeMB.toFixed(1)} MB
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Checklist verification */}
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900">
                          Checklist Verification
                        </h4>
                        <div className="space-y-2">
                          {selected.checklist.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={reviewChecklist[item.id] ?? false}
                                onChange={(e) =>
                                  setReviewChecklist((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                                disabled={selected.status !== "SUBMITTED"}
                              />
                              <span className="flex-1 text-sm text-gray-700">
                                {item.label}
                              </span>
                              {item.required && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Required
                                </Badge>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* GPS metadata */}
                      {selected.gpsData && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-gray-900">
                            GPS Verification
                          </h4>
                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 text-accent-600" />
                              <div>
                                {selected.gpsData.address && (
                                  <p className="text-sm font-medium text-gray-900">
                                    {selected.gpsData.address}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {selected.gpsData.latitude.toFixed(4)},{" "}
                                  {selected.gpsData.longitude.toFixed(4)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Accuracy: {selected.gpsData.accuracy}m
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Signature + Feedback (only for SUBMITTED) */}
                      {selected.status === "SUBMITTED" && (
                        <>
                          {/* Digital signature */}
                          <div>
                            <Label
                              htmlFor="signature"
                              className="mb-2 block text-sm font-semibold text-gray-900"
                            >
                              Digital Signature
                            </Label>
                            <Input
                              id="signature"
                              value={signature}
                              onChange={(e) => setSignature(e.target.value)}
                              placeholder="Type your full name to sign"
                              className="font-mono"
                            />
                          </div>

                          {/* Feedback */}
                          <div>
                            <Label
                              htmlFor="feedback"
                              className="mb-2 block text-sm font-semibold text-gray-900"
                            >
                              Feedback
                            </Label>
                            <textarea
                              id="feedback"
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              rows={4}
                              placeholder="Provide feedback for the learner..."
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-3 border-t border-gray-100 pt-4">
                            <Button
                              variant="destructive"
                              className="flex-1"
                              onClick={() => handleVerify("REJECTED")}
                              disabled={isSubmitting || !feedback.trim()}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                            <Button
                              className="flex-1"
                              onClick={() => handleVerify("APPROVED")}
                              disabled={isSubmitting}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Show existing feedback for verified/rejected */}
                      {selected.status !== "SUBMITTED" && selected.feedback && (
                        <div>
                          <h4 className="mb-2 text-sm font-semibold text-gray-900">
                            Feedback Given
                          </h4>
                          <div
                            className={cn(
                              "rounded-lg border p-3 text-sm",
                              selected.status === "VERIFIED"
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-red-200 bg-red-50 text-red-800"
                            )}
                          >
                            {selected.feedback}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Evidence lightbox overlay */}
      {evidenceViewerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setEvidenceViewerUrl(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEvidenceViewerUrl(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Evidence viewer"
        >
          <div
            className="relative max-h-[80vh] max-w-[80vw] rounded-xl bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-3 -top-3 rounded-full bg-white shadow-md"
              onClick={() => setEvidenceViewerUrl(null)}
              aria-label="Close evidence viewer"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex h-[60vh] w-[60vw] items-center justify-center rounded-lg bg-gray-100">
              <div className="text-center text-gray-400">
                <ImageIcon className="mx-auto h-12 w-12" />
                <p className="mt-2 text-sm">Evidence preview</p>
                <p className="text-xs">
                  Full evidence viewer would render here
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
