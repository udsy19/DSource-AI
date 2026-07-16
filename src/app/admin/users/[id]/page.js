"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  adminFetch,
  ErrorNote,
  fmtDate,
  Panel,
  RoleBadge,
  StatusBadge,
} from "@/components/admin/ui";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await adminFetch(`/api/admin/users/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (body) => {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/users/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this user and all their data? This cannot be undone."))
      return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      router.push("/admin/users");
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (error && !data) return <ErrorNote message={error} />;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const {
    user,
    profile,
    generationEvents,
    analysisEvents,
    designs,
    activity,
    products,
  } = data;
  const banned = !!profile?.banned || !!user.banned_until;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin/users")}
        className="text-sm text-gray-500 hover:underline"
      >
        ← Back to users
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{user.email}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <RoleBadge role={user.role} />
            {banned
              ? <span className="font-semibold text-red-600">Banned</span>
              : <span className="text-green-600">Active</span>}
            <span>Joined {fmtDate(user.created_at)}</span>
            <span>Last sign-in {fmtDate(user.last_sign_in_at)}</span>
          </div>
        </div>
      </div>

      <ErrorNote message={error} />

      <Panel title="Access control">
        <div className="flex flex-wrap items-center gap-3">
          <select
            defaultValue={user.role}
            disabled={busy}
            onChange={(e) => act({ action: "role", role: e.target.value })}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="user">user</option>
            <option value="vendor">vendor</option>
            <option value="admin">admin</option>
          </select>
          {banned
            ? <button
                type="button"
                disabled={busy}
                onClick={() => act({ action: "unban" })}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Unban
              </button>
            : <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const reason = prompt("Reason for ban (optional):") || null;
                  act({ action: "ban", reason });
                }}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                Ban user
              </button>}
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Delete user
          </button>
        </div>
        {profile?.banned_reason && (
          <p className="mt-3 text-sm text-gray-500">
            Ban reason: {profile.banned_reason}
          </p>
        )}
      </Panel>

      <Panel title={`Generated designs (${designs.length})`}>
        {designs.length === 0
          ? <p className="text-sm text-gray-500">No designs yet.</p>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {designs.map((d) => (
                <div
                  key={d.id}
                  className="overflow-hidden rounded-lg border border-gray-200"
                >
                  {d.url
                    ? // biome-ignore lint/performance/noImgElement: signed Storage URL, not a static asset
                      <img
                        src={d.url}
                        alt={d.prompt || "Generated design"}
                        className="aspect-square w-full object-cover"
                      />
                    : <div className="flex aspect-square items-center justify-center bg-gray-50 text-xs text-gray-400">
                        (image)
                      </div>}
                  <p
                    className="truncate px-2 py-1 text-xs text-gray-500"
                    title={d.prompt}
                  >
                    {d.prompt || "—"}
                  </p>
                </div>
              ))}
            </div>}
      </Panel>

      <Panel title={`AI generations (${generationEvents.length})`}>
        <EventTable
          rows={generationEvents}
          columns={[
            ["Prompt", (r) => r.prompt],
            ["Status", (r) => <StatusBadge status={r.status} />],
            [
              "Latency",
              (r) => (r.latency_ms != null ? `${r.latency_ms} ms` : "—"),
            ],
            ["When", (r) => fmtDate(r.created_at)],
          ]}
        />
      </Panel>

      <Panel title={`AI analyses (${analysisEvents.length})`}>
        <EventTable
          rows={analysisEvents}
          columns={[
            ["Space", (r) => r.space_type || "—"],
            ["Interior?", (r) => (r.is_interior ? "yes" : "no")],
            ["Status", (r) => <StatusBadge status={r.status} />],
            ["When", (r) => fmtDate(r.created_at)],
          ]}
        />
      </Panel>

      <Panel title={`Products (${products.length})`}>
        <EventTable
          rows={products}
          columns={[
            ["Name", (r) => r.product_name],
            ["Category", (r) => r.category_name || "—"],
            ["Added", (r) => fmtDate(r.created_at)],
          ]}
        />
      </Panel>

      <Panel title={`Activity (${activity.length})`}>
        <EventTable
          rows={activity}
          columns={[
            ["Event", (r) => r.event_type],
            ["Details", (r) => (r.metadata ? JSON.stringify(r.metadata) : "—")],
            ["When", (r) => fmtDate(r.created_at)],
          ]}
        />
      </Panel>
    </div>
  );
}

function EventTable({ rows, columns }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-500">Nothing yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500">
          <tr>
            {columns.map(([label]) => (
              <th key={label} className="pb-2 pr-4">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map(([label, render]) => (
                <td
                  key={label}
                  className="max-w-xs truncate py-2 pr-4 text-gray-700"
                >
                  {render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
