import {
  Siren,
  Baby,
  HeartPulse,
  Shield,
  Scissors,
  Pill,
  Users,
} from "lucide-react";

const specialties = [
  { icon: Siren, name: "Emergency Triage", color: "text-healthcare-red bg-red-50" },
  { icon: Baby, name: "Maternal Health", color: "text-pink-500 bg-pink-50" },
  { icon: HeartPulse, name: "Pediatric Care", color: "text-brand-500 bg-brand-50" },
  { icon: Shield, name: "Infection Control", color: "text-accent-500 bg-accent-50" },
  { icon: Scissors, name: "Basic Surgical Assist", color: "text-healthcare-amber bg-amber-50" },
  { icon: Pill, name: "Medication Management", color: "text-healthcare-purple bg-purple-50" },
  { icon: Users, name: "Community Health", color: "text-teal-500 bg-teal-50" },
];

export function SpecialtiesGrid() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Medical Specialties
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Comprehensive Coverage
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Courses designed by Korean medical experts across essential specialties.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          {specialties.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-5 py-3 shadow-sm transition-all hover:shadow-md"
            >
              <div className={`rounded-lg p-2 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-800">
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
