import { Smartphone, WifiOff, Sparkles } from "lucide-react";

const values = [
  {
    icon: Smartphone,
    title: "Reach Every Healthcare Worker",
    description:
      "Mobile-first design works on any smartphone. No app store needed — PWA installs directly from the browser. Shared device support for clinics with limited equipment.",
    features: [
      "PWA — no app store dependency",
      "Shared device multi-user support",
      "Works on low-end smartphones",
    ],
    gradient: "from-brand-500 to-brand-600",
  },
  {
    icon: WifiOff,
    title: "Train Without Internet",
    description:
      "Download courses over WiFi, learn anywhere in the field. Adaptive bandwidth detection auto-selects content quality. Background sync when connection returns.",
    features: [
      "Full offline course access",
      "2G-optimized content delivery",
      "Automatic progress sync",
    ],
    gradient: "from-accent-500 to-accent-600",
  },
  {
    icon: Sparkles,
    title: "Build Courses with AI",
    description:
      "Upload clinical guidelines in any language. AI structures content into microlearning modules, generates quizzes, and translates with verified medical terminology.",
    features: [
      "SOP → Course in < 30 minutes",
      "130+ language translation",
      "Mandatory expert review gate",
    ],
    gradient: "from-healthcare-purple to-purple-700",
  },
];

export function ValueCards() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Why MEDICHIPS-LINK
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Built for the Real World
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Designed from the ground up for healthcare training in
            resource-limited settings.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-lg"
            >
              {/* Top gradient bar */}
              <div
                className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${value.gradient}`}
              />

              <div
                className={`inline-flex rounded-xl bg-gradient-to-r ${value.gradient} p-3`}
              >
                <value.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="mt-5 text-xl font-bold text-gray-900">
                {value.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {value.description}
              </p>

              <ul className="mt-6 space-y-2">
                {value.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <svg
                      className="h-4 w-4 shrink-0 text-accent-500"
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
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
