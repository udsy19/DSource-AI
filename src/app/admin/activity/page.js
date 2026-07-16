"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, ErrorNote, fmtDate, Panel } from "@/components/admin/ui";

export default function AdminActivityPage() {
  const [events, setEvents] = useState([]);
  const [eventType, setEventType] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch(
        `/api/admin/activity?eventType=${encodeURIComponent(eventType)}`,
      );
      setEvents(data.events);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [eventType]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Activity</h1>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
        >
          <option value="">All events</option>
          <option value="ai_generate">ai_generate</option>
          <option value="ai_analyze">ai_analyze</option>
          <option value="csv_upload">csv_upload</option>
        </select>
      </div>

      <ErrorNote message={error} />

      <Panel>
        {loading
          ? <p className="text-sm text-gray-500">Loading…</p>
          : events.length === 0
            ? <p className="text-sm text-gray-500">No activity.</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="pb-2 pr-4">When</th>
                      <th className="pb-2 pr-4">User</th>
                      <th className="pb-2 pr-4">Event</th>
                      <th className="pb-2 pr-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {events.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap py-2 pr-4 text-gray-600">
                          {fmtDate(e.created_at)}
                        </td>
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
                        <td className="py-2 pr-4">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {e.event_type}
                          </span>
                        </td>
                        <td className="max-w-md truncate py-2 pr-4 text-gray-500">
                          {e.metadata ? JSON.stringify(e.metadata) : "—"}
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
