export default function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Supervisor Dashboard
        </h1>
        <p className="text-gray-500">Monitor your team&apos;s progress</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Active Learners</p>
          <p className="mt-1 text-3xl font-bold text-accent-600">0</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pending Reviews</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">0</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Verifications Today</p>
          <p className="mt-1 text-3xl font-bold text-brand-600">0</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Pending Task Submissions
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          No pending submissions to review.
        </p>
      </div>
    </div>
  );
}
