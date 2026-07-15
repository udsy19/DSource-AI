"use client";

export default function NoticesBox({ notices }) {
  if (!notices.length) return null;
  return (
    <div className="mt-3 space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="viz-mono text-[11px] uppercase tracking-widest text-amber-700">
        Notice
      </p>
      {notices.map((notice) => (
        <p key={notice} className="text-xs text-amber-900">
          {notice}
        </p>
      ))}
    </div>
  );
}
