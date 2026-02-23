const results = [
  {
    metric: "1/10",
    suffix: "x Cost",
    description: "Per-worker training cost compared to in-person programs",
    color: "from-brand-500 to-brand-600",
  },
  {
    metric: "10",
    suffix: "x Reach",
    description: "More healthcare workers trained with the same budget",
    color: "from-accent-500 to-accent-600",
  },
  {
    metric: "94%",
    suffix: "",
    description: "Lesson completion rate, even in low-connectivity regions",
    color: "from-healthcare-purple to-purple-700",
  },
  {
    metric: "87%",
    suffix: "",
    description: "Competency verification pass rate after L-D-V-I cycle",
    color: "from-healthcare-amber to-amber-600",
  },
  {
    metric: "< 30",
    suffix: "min",
    description: "To build a full course from SOPs using AI Course Builder",
    color: "from-pink-500 to-rose-600",
  },
  {
    metric: "100%",
    suffix: "",
    description: "Offline learning capability with automatic sync on reconnect",
    color: "from-teal-500 to-teal-600",
  },
];

export function ResultsGrid() {
  return (
    <section id="impact" className="scroll-mt-20 bg-gray-50/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Impact
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
            Measurable Results
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Real outcomes from AI-powered medical training at scale.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <div
              key={result.description}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:shadow-lg"
            >
              <div
                className={`inline-flex items-baseline gap-1 bg-gradient-to-r ${result.color} bg-clip-text text-transparent`}
              >
                <span className="text-4xl font-bold">{result.metric}</span>
                {result.suffix && (
                  <span className="text-lg font-semibold">{result.suffix}</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                {result.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
