export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Overview of your organization</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Learners", value: "0", color: "bg-brand-50 text-brand-600" },
          { label: "Active Courses", value: "0", color: "bg-accent-50 text-accent-600" },
          { label: "Completion Rate", value: "0%", color: "bg-purple-50 text-purple-600" },
          { label: "Pending Reviews", value: "0", color: "bg-amber-50 text-amber-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color.split(" ")[1]}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent activity placeholder */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <p className="mt-2 text-sm text-gray-500">
          No recent activity. Create your first course to get started.
        </p>
      </div>
    </div>
  );
}
