import {
  Smartphone,
  RotateCcw,
  WifiOff,
  Sparkles,
  BarChart3,
  Award,
} from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "Microlearning",
    description:
      "5-minute lessons optimized for mobile. Healthcare workers learn on their own schedule, even between shifts.",
    color: "bg-brand-50 text-brand-500",
  },
  {
    icon: RotateCcw,
    title: "L-D-V-I Full Cycle",
    description:
      "Learn, Do, Verify, Improve — a complete training cycle that ensures knowledge transfers to real clinical practice.",
    color: "bg-accent-50 text-accent-500",
  },
  {
    icon: WifiOff,
    title: "Offline First",
    description:
      "Download courses over WiFi, learn anywhere. Automatic sync when connection returns. Works on 2G networks.",
    color: "bg-amber-50 text-healthcare-amber",
  },
  {
    icon: Sparkles,
    title: "AI Course Builder",
    description:
      "Upload SOPs and clinical guidelines — AI automatically structures them into multilingual microlearning courses.",
    color: "bg-purple-50 text-healthcare-purple",
  },
  {
    icon: BarChart3,
    title: "Impact Dashboard",
    description:
      "Real-time tracking of cost per healthcare worker, competency rates, and program outcomes for KOICA reporting.",
    color: "bg-rose-50 text-healthcare-red",
  },
  {
    icon: Award,
    title: "Digital Certificates",
    description:
      "Verifiable completion certificates with tamper-proof hashes. Public verification page for credential validation.",
    color: "bg-blue-50 text-brand-600",
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Everything for Medical Training
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Purpose-built for healthcare education in low-resource settings.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-brand-100 hover:shadow-md"
            >
              <div
                className={`inline-flex rounded-xl p-3 ${feature.color}`}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
