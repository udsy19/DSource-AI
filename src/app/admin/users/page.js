"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminFetch,
  ErrorNote,
  fmtDate,
  Panel,
  RoleBadge,
} from "@/components/admin/ui";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch(
        `/api/admin/users?q=${encodeURIComponent(query || "")}`,
      );
      setUsers(data.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email…"
            className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Search
          </button>
        </form>
      </div>

      <ErrorNote message={error} />

      <Panel>
        {loading
          ? <p className="text-sm text-gray-500">Loading…</p>
          : users.length === 0
            ? <p className="text-sm text-gray-500">No users found.</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Last sign-in</th>
                      <th className="pb-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-3">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {u.email}
                          </Link>
                          {!u.email_confirmed && (
                            <span className="ml-2 text-xs text-yellow-600">
                              unconfirmed
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="py-3">
                          {u.banned
                            ? <span className="text-xs font-semibold text-red-600">
                                Banned
                              </span>
                            : <span className="text-xs text-green-600">
                                Active
                              </span>}
                        </td>
                        <td className="py-3 text-gray-600">
                          {fmtDate(u.last_sign_in_at)}
                        </td>
                        <td className="py-3 text-gray-600">
                          {fmtDate(u.created_at)}
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
