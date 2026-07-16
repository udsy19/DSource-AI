"use client";

import { useId, useState } from "react";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-3 py-2.5 text-sm focus:border-[var(--viz-ink)] focus:outline-none";

/**
 * Inline "start a folio" form: name is the promise, client and city are
 * spec-sheet facts. POSTs /api/projects and hands the new folio back.
 */
export default function NewFolioForm({ onCreated, onCancel }) {
  const uid = useId();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError("Give the folio a name — the home or the client.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientName: clientName.trim() || null,
          address: address.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create the folio. Please try again.");
        return;
      }
      onCreated(data.project);
    } catch {
      setError("Could not create the folio. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="viz-panel p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="viz-serif text-2xl">A new folio</h2>
        <p className="viz-label">One per home</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${uid}-name`} className="viz-label">
            Name
          </label>
          <input
            id={`${uid}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Marine Drive apartment"
            className={INPUT_CLASS}
            // First field of a form the user explicitly opened.
            // biome-ignore lint/a11y/noAutofocus: intentional — the form appears on request
            autoFocus
          />
        </div>
        <div>
          <label htmlFor={`${uid}-client`} className="viz-label">
            Client (optional)
          </label>
          <input
            id={`${uid}-client`}
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            maxLength={120}
            placeholder="The Mehtas"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-address`} className="viz-label">
            City / address (optional)
          </label>
          <input
            id={`${uid}-address`}
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={160}
            placeholder="Mumbai"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
      <div className="mt-5 flex items-center gap-5">
        <button
          type="submit"
          disabled={saving}
          className="viz-btn cursor-pointer rounded-full bg-[var(--viz-ink)] px-6 py-2.5 text-[var(--viz-paper)] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
        >
          {saving ? "Creating…" : "Create folio"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="viz-mono cursor-pointer text-xs tracking-[0.08em] uppercase text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
