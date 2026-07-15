"use client";

export default function NoticesBox({ notices }) {
  if (!notices.length) return null;
  return (
    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
      {notices.map((notice) => (
        <p key={notice} className="text-xs text-amber-800">
          {notice}
        </p>
      ))}
    </div>
  );
}
