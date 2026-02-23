export default function LearnerDashboard() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good morning!</h1>
        <p className="text-sm text-gray-500">Continue your learning journey</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-brand-50 p-3 text-center">
          <p className="text-xl font-bold text-brand-600">0</p>
          <p className="text-[10px] text-gray-600">XP Earned</p>
        </div>
        <div className="rounded-xl bg-accent-50 p-3 text-center">
          <p className="text-xl font-bold text-accent-600">0</p>
          <p className="text-[10px] text-gray-600">Day Streak</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3 text-center">
          <p className="text-xl font-bold text-purple-600">0%</p>
          <p className="text-[10px] text-gray-600">Completed</p>
        </div>
      </div>

      {/* Continue learning */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Continue Learning
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            No courses enrolled yet. Browse available courses to get started.
          </p>
        </div>
      </section>

      {/* Pending tasks */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Pending Tasks
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">No pending tasks.</p>
        </div>
      </section>

      {/* Recent achievements */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Recent Achievements
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Complete lessons to earn badges and XP!
          </p>
        </div>
      </section>
    </div>
  );
}
