"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, ErrorNote, fmtDate, Panel } from "@/components/admin/ui";

const ACTION_LABEL = {
  ban_user: "Banned user",
  unban_user: "Unbanned user",
  change_role: "Changed role",
  delete_user: "Deleted user",
  delete_design: "Removed design",
  moderate_product: "Moderated product",
  delete_product: "Deleted product",
};

export default function AdminAccessPage() {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/admin/audit")
      .then((data) => setEntries(data.entries))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Access & Audit</h1>
        <p className="mt-1 text-sm text-gray-600">
          Every privileged admin action is recorded here.
        </p>
      </div>

      <ErrorNote message={error} />

      <Panel>
        {loading
          ? <p className="text-sm text-gray-500">Loading…</p>
          : entries.length === 0
            ? <p className="text-sm text-gray-500">
                No admin actions recorded yet.
              </p>
            : <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="pb-2 pr-4">When</th>
                      <th className="pb-2 pr-4">Admin</th>
                      <th className="pb-2 pr-4">Action</th>
                      <th className="pb-2 pr-4">Target</th>
                      <th className="pb-2 pr-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap py-2 pr-4 text-gray-600">
                          {fmtDate(e.created_at)}
                        </td>
                        <td className="py-2 pr-4 text-gray-700">
                          {e.admin_email || e.admin_id?.slice(0, 8) || "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="font-medium text-gray-900">
                            {ACTION_LABEL[e.action] || e.action}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {e.target_user_id
                            ? <Link
                                href={`/admin/users/${e.target_user_id}`}
                                className="text-gray-600 hover:underline"
                              >
                                {e.target_email || e.target_user_id.slice(0, 8)}
                              </Link>
                            : e.target_id || "—"}
                        </td>
                        <td className="max-w-xs truncate py-2 pr-4 text-gray-500">
                          {e.after ? JSON.stringify(e.after) : "—"}
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
