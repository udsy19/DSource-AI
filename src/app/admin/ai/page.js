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

const TABS = [
  { key: "calls", label: "All AI calls" },
  { key: "generation", label: "Generations" },
  { key: "analysis", label: "Analyses" },
];

export default function AdminAiMonitorPage() {
  const [tab, setTab] = useState("calls");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "calls") {
        const data = await adminFetch(`/api/admin/ai-calls?status=${status}`);
        setRows(data.calls);
      } else {
        const data = await adminFetch(
          `/api/admin/ai-events?type=${tab}&status=${status}`,
        );
        setRows(data.events);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, status]);

  useEffect(() => {
    load();
  }, [load]);

  const userCell = (r) =>
    r.user_id ? (
      <Link
        href={`/admin/users/${r.user_id}`}
        className="text-gray-900 hover:underline"
      >
        {r.email || r.user_id.slice(0, 8)}
      </Link>
    ) : (
      "—"
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Monitor</h1>
        <p className="mt-1 text-sm text-gray-600">
          Every model invocation (Gemini + Replicate) across every route is
          recorded here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1 font-medium ${
                tab === t.key ? "bg-white shadow-sm" : "text-gray-500"
              }`}
            >
              {t.label}
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
          <option value="error">error</option>
          {tab !== "calls" && <option value="rejected">rejected</option>}
          {tab !== "calls" && <option value="blocked">blocked</option>}
        </select>
      </div>

      <ErrorNote message={error} />

      <Panel>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No records.</p>
        ) : tab === "calls" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="pb-2 pr-4">When</th>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Route</th>
                  <th className="pb-2 pr-4">Call</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap py-2 pr-4 text-gray-600">
                      {fmtDate(c.created_at)}
                    </td>
                    <td className="py-2 pr-4">{userCell(c)}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {c.route || "—"}
                      </span>
                    </td>
                    <td className="max-w-xs truncate py-2 pr-4 text-gray-700">
                      {c.label || "—"}
                      {c.model ? (
                        <span className="text-gray-400"> · {c.model}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {c.provider || "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {c.latency_ms != null ? `${c.latency_ms} ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">
                    {tab === "generation" ? "Prompt" : "Space"}
                  </th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Latency</th>
                  <th className="pb-2 pr-4">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4">{userCell(e)}</td>
                    <td className="max-w-xs truncate py-2 pr-4 text-gray-700">
                      {tab === "generation"
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
          </div>
        )}
      </Panel>
    </div>
  );
}
