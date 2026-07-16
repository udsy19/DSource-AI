"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminFetch,
  ErrorNote,
  fmtDate,
  Panel,
  StatusBadge,
} from "@/components/admin/ui";

export default function AdminAiMonitorPage() {
  const [type, setType] = useState("generation");
  const [status, setStatus] = useState("");
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch(
        `/api/admin/ai-events?type=${type}&status=${status}`,
      );
      setEvents(data.events);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [type, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">AI Monitor</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
          {["generation", "analysis"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md px-3 py-1 font-medium ${
                type === t ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              {t === "generation" ? "Generations" : "Analyses"}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="success">success</option>
          <option value="rejected">rejected</option>
          <option value="blocked">blocked</option>
          <option value="error">error</option>
        </select>
      </div>

      <ErrorNote message={error} />

      <Panel>
        {loading
          ? <p className="text-sm text-gray-500">Loading…</p>
          : events.length === 0
            ? <p className="text-sm text-gray-500">No events.</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="pb-2 pr-4">User</th>
                      <th className="pb-2 pr-4">
                        {type === "generation" ? "Prompt" : "Space"}
                      </th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4">Latency</th>
                      <th className="pb-2 pr-4">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 pr-4">
                          {e.user_id
                            ? <Link
                                href={`/admin/users/${e.user_id}`}
                                className="text-gray-900 hover:underline"
                              >
                                {e.email || e.user_id.slice(0, 8)}
                              </Link>
                            : "—"}
                        </td>
                        <td className="max-w-xs truncate py-2 pr-4 text-gray-700">
                          {type === "generation"
                            ? e.prompt || "—"
                            : e.space_type || "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {e.latency_ms != null ? `${e.latency_ms} ms` : "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {fmtDate(e.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
      </Panel>
    </div>
  );
}
