"use client";

import { useEffect, useState } from "react";
import { adminFetch, ErrorNote, StatCard } from "@/components/admin/ui";

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminFetch("/api/admin/metrics")
      .then(setMetrics)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!metrics) return <p className="text-sm text-gray-500">Loading…</p>;

  const { users, ai, activityLast24h } = metrics;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-600">
          A live snapshot of users, AI usage, and activity across DSource.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Users</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Total" value={users.total} />
          <StatCard label="Clients" value={users.clients} />
          <StatCard label="Vendors" value={users.vendors} />
          <StatCard label="Admins" value={users.admins} />
          <StatCard label="Banned" value={users.banned} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">AI usage</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard
            label="AI calls (all)"
            value={ai.callsTotal}
            hint={`${ai.callErrors} errors`}
          />
          <StatCard
            label="Generations"
            value={ai.generationsTotal}
            hint={`${ai.generationsLast7d} in last 7 days`}
          />
          <StatCard label="Designs stored" value={ai.designsTotal} />
          <StatCard label="Analyses" value={ai.analysesTotal} />
          <StatCard
            label="Generation errors"
            value={ai.generationErrors}
            hint="non-success outcomes"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Activity</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Events (24h)" value={activityLast24h} />
        </div>
      </section>
    </div>
  );
}
