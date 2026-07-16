"use client";

/** Fetch JSON from an admin API; throws with the server error message on !ok. */
export async function adminFetch(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const message =
      res.status === 403
        ? "You don't have admin access."
        : data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function fmtRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const secs = Math.round((d - Date.now()) / 1000);
  const abs = Math.abs(secs);
  const units = [
    ["year", 31536000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [name, size] of units) {
    if (abs >= size || name === "second") {
      const value = Math.round(secs / size);
      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
      return rtf.format(value, name);
    }
  }
  return "—";
}

const ROLE_STYLES = {
  admin: "bg-purple-100 text-purple-800",
  vendor: "bg-blue-100 text-blue-800",
  user: "bg-gray-100 text-gray-700",
};

export function RoleBadge({ role }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        ROLE_STYLES[role] || ROLE_STYLES.user
      }`}
    >
      {role || "user"}
    </span>
  );
}

const STATUS_STYLES = {
  success: "bg-green-100 text-green-800",
  rejected: "bg-yellow-100 text-yellow-800",
  blocked: "bg-orange-100 text-orange-800",
  error: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status || "—"}
    </span>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div
      className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}
