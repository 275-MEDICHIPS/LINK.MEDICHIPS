import { BookOpen, Hammer, ShieldCheck, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: BookOpen,
    title: "LEARN",
    subtitle: "Microlearning",
    description:
      "5-minute video and text lessons adapted to your bandwidth. Download for offline access. AI-translated into your language.",
    color: "border-brand-500 bg-brand-50 text-brand-500",
    accent: "text-brand-500",
  },
  {
    number: "02",
    icon: Hammer,
    title: "DO",
    subtitle: "Practice Tasks",
    description:
      "Auto-generated practical tasks linked to each lesson. Checklists guide real clinical practice. Photo/video evidence capture.",
    color: "border-accent-500 bg-accent-50 text-accent-500",
    accent: "text-accent-500",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "VERIFY",
    subtitle: "Multi-level Review",
    description:
      "L1: AI verification for basic competencies. L2: Supervisor digital signature. L3: In-person mentor assessment for high-risk procedures.",
    color: "border-healthcare-amber bg-amber-50 text-healthcare-amber",
    accent: "text-healthcare-amber",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "IMPROVE",
    subtitle: "Gap Analysis",
    description:
      "AI analyzes weak areas and recommends supplementary lessons. Competency snapshots track growth over time. Continuous improvement loop.",
    color: "border-healthcare-purple bg-purple-50 text-healthcare-purple",
    accent: "text-healthcare-purple",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 bg-gray-50/50 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            How It Works
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Learn &rarr; Do &rarr; Verify &rarr; Improve
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            A complete training cycle that bridges the gap between knowledge and clinical practice.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connection line (desktop) */}
          <div className="absolute left-0 right-0 top-24 hidden h-0.5 bg-gradient-to-r from-brand-200 via-accent-200 to-purple-200 lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                {/* Step circle */}
                <div
                  className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${step.color}`}
                >
                  <step.icon className="h-7 w-7" />
                </div>

                {/* Step number */}
                <span
                  className={`mt-4 text-xs font-bold uppercase tracking-widest ${step.accent}`}
                >
                  Step {step.number}
                </span>

                <h3 className="mt-2 text-xl font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className={`text-sm font-medium ${step.accent}`}>
                  {step.subtitle}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
