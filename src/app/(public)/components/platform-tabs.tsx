"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Hammer,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from "lucide-react";

const tabs = [
  {
    id: "learn",
    icon: BookOpen,
    label: "Microlearning",
    title: "5-Minute Lessons, Maximum Retention",
    description:
      "Video and text lessons designed for mobile-first healthcare workers. Adaptive bitrate streaming works on 2G networks. Download entire courses for offline learning. AI-translated into 130+ languages with verified medical terminology.",
    features: [
      "Adaptive video quality (2G to WiFi)",
      "Offline-first with auto-sync",
      "AI translation with medical glossary",
      "Progress tracking across devices",
    ],
    preview: {
      type: "lesson",
      stats: [
        { label: "Avg. lesson", value: "5 min" },
        { label: "Completion rate", value: "94%" },
        { label: "Offline capable", value: "100%" },
      ],
    },
  },
  {
    id: "do",
    icon: Hammer,
    label: "Practice Tasks",
    title: "Bridge Knowledge to Clinical Practice",
    description:
      "Every lesson auto-generates practical tasks with step-by-step checklists. Healthcare workers capture photo and video evidence from real clinical settings. GPS metadata ensures authenticity.",
    features: [
      "Auto-generated task checklists",
      "Photo/video evidence capture",
      "GPS location verification",
      "Supervisor assignment workflow",
    ],
    preview: {
      type: "task",
      stats: [
        { label: "Tasks/course", value: "15-30" },
        { label: "Evidence types", value: "4" },
        { label: "Review time", value: "< 24h" },
      ],
    },
  },
  {
    id: "verify",
    icon: ShieldCheck,
    label: "Verification",
    title: "Multi-Level Competency Verification",
    description:
      "Three-tier verification ensures appropriate rigor for each risk level. AI handles low-risk assessments instantly. Supervisors digitally sign mid-level competencies. High-risk procedures require in-person mentor review.",
    features: [
      "L1: AI auto-verification (low risk)",
      "L2: Supervisor digital signature",
      "L3: In-person mentor assessment",
      "Tamper-proof verification records",
    ],
    preview: {
      type: "verify",
      stats: [
        { label: "AI accuracy", value: "97%" },
        { label: "Sign-off time", value: "< 4h" },
        { label: "Verification levels", value: "3" },
      ],
    },
  },
  {
    id: "improve",
    icon: TrendingUp,
    label: "Improvement",
    title: "AI-Driven Continuous Improvement",
    description:
      "Intelligent gap analysis identifies weak areas and recommends targeted supplementary lessons. Competency snapshots track growth over time. Personalized improvement plans close skill gaps systematically.",
    features: [
      "Weakness pattern detection",
      "Personalized lesson recommendations",
      "Competency trajectory tracking",
      "Improvement plan generation",
    ],
    preview: {
      type: "improve",
      stats: [
        { label: "Skill gap closure", value: "85%" },
        { label: "Personalization", value: "AI" },
        { label: "Update frequency", value: "Real-time" },
      ],
    },
  },
  {
    id: "ai",
    icon: Sparkles,
    label: "AI Course Builder",
    title: "SOPs to Courses in Minutes",
    description:
      "Upload clinical guidelines, SOPs, or training manuals. AI automatically structures them into microlearning modules with quizzes, tasks, and assessments. Human review gates ensure medical accuracy.",
    features: [
      "Upload any document format",
      "Auto-structure into L-D-V-I modules",
      "Generate quizzes & assessments",
      "Mandatory expert review gate",
    ],
    preview: {
      type: "ai",
      stats: [
        { label: "Build time", value: "< 30 min" },
        { label: "Languages", value: "130+" },
        { label: "Review required", value: "Always" },
      ],
    },
  },
];

const AUTO_ROTATE_MS = 8000;

export function PlatformTabs() {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [activeTab]);

  const active = tabs[activeTab];

  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Platform
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            The Complete L-D-V-I Training Platform
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Five integrated pillars that take healthcare workers from knowledge
            to verified clinical competency.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                i === activeTab
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h3 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {active.title}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-gray-600">
              {active.description}
            </p>
            <ul className="mt-6 space-y-3">
              {active.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100">
                    <svg
                      className="h-3 w-3 text-accent-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Preview card */}
          <div className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
              {/* Preview header */}
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <active.icon className="h-5 w-5 text-brand-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {active.label}
                  </span>
                </div>
              </div>

              {/* Preview body */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {active.preview.stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-2xl font-bold text-brand-600">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Progress bar animation */}
                <div className="mt-6 space-y-3">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-[8000ms] ease-linear"
                      style={{ width: "100%" }}
                      key={activeTab}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Module progress</span>
                    <span>
                      {activeTab + 1}/{tabs.length}
                    </span>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="mt-6 space-y-2">
                  {active.features.slice(0, 3).map((f, i) => (
                    <div
                      key={f}
                      className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 text-xs font-bold text-brand-600">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
