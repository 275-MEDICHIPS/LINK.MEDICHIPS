import { GraduationCap, Users, Shield } from "lucide-react";

const personas = [
  {
    icon: GraduationCap,
    role: "Healthcare Workers",
    subtitle: "Learners in the Field",
    color: "border-brand-500 bg-brand-50 text-brand-500",
    benefits: [
      "5-minute mobile lessons between shifts",
      "Download courses for offline learning",
      "Earn XP, badges, and certificates",
      "Auto-generated practice tasks",
      "Track your competency growth",
      "Learn in your own language",
    ],
    preview: {
      title: "Learner Dashboard",
      items: [
        { label: "Today's lesson", value: "Triage Assessment" },
        { label: "Current streak", value: "12 days" },
        { label: "XP earned", value: "2,450" },
      ],
    },
  },
  {
    icon: Users,
    role: "Supervisors",
    subtitle: "On-site Managers",
    color: "border-accent-500 bg-accent-50 text-accent-500",
    benefits: [
      "Monitor learner progress in real-time",
      "Review task submissions and evidence",
      "Digitally sign competency verifications",
      "Assign remedial tasks automatically",
      "Generate site-level reports",
      "SMS fallback for low-connectivity alerts",
    ],
    preview: {
      title: "Supervisor Panel",
      items: [
        { label: "Pending reviews", value: "8" },
        { label: "Team completion", value: "73%" },
        { label: "Verifications today", value: "5" },
      ],
    },
  },
  {
    icon: Shield,
    role: "Administrators",
    subtitle: "Program & KOICA Managers",
    color: "border-healthcare-purple bg-purple-50 text-healthcare-purple",
    benefits: [
      "AI Course Builder from SOPs",
      "Multi-country program management",
      "KOICA impact reporting dashboard",
      "Cost-per-worker analytics",
      "Content review workflow",
      "Organization hierarchy management",
    ],
    preview: {
      title: "Admin Console",
      items: [
        { label: "Active programs", value: "6" },
        { label: "Total workers", value: "2,847" },
        { label: "Avg. cost/worker", value: "$42" },
      ],
    },
  },
];

export function PersonaColumns() {
  return (
    <section className="bg-gradient-to-b from-white to-brand-50/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            For Everyone
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Built for Your Role
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Purpose-built experiences for every stakeholder in the training
            ecosystem.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {personas.map((persona) => (
            <div
              key={persona.role}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-lg hover:border-brand-200"
            >
              {/* Header */}
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${persona.color}`}
                  >
                    <persona.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {persona.role}
                    </h3>
                    <p className="text-sm text-gray-500">{persona.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="px-6 py-5">
                <ul className="space-y-3">
                  {persona.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preview card */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {persona.preview.title}
                </p>
                <div className="space-y-2">
                  {persona.preview.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-gray-500">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
