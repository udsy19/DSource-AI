"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const MENU_WIDTH = 240;

const ROW_CLASS =
  "viz-mono block w-full cursor-pointer px-3 py-2 text-left text-[11px] tracking-[0.08em] uppercase text-[var(--viz-ink)] transition-colors hover:bg-[var(--viz-ground)] disabled:cursor-wait disabled:opacity-50";

/**
 * Quiet per-version menu for the history strip: favorite toggle, "file into
 * folio…" (folios + rooms via GET /api/projects), archive. Rendered as a
 * fixed-position popover so the strip's horizontal scroll can't clip it.
 * `onUpdate(item, patch)` PATCHes /api/renders/[id] and returns success.
 */
export default function RenderActionsMenu({ item, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [showFolios, setShowFolios] = useState(false);
  const [folios, setFolios] = useState(null); // null = not loaded yet
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const btnRef = useRef(null);

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 6,
        left: Math.max(
          8,
          Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
        ),
      });
    }
    setShowFolios(false);
    setOpen(true);
  };

  const loadFolios = async () => {
    setShowFolios(true);
    if (folios !== null) return;
    try {
      const res = await fetch("/api/projects");
      const data = await res.json().catch(() => ({}));
      setFolios(data.projects ?? []);
      setNotice(data.notice ?? null);
    } catch {
      setFolios([]);
      setNotice("Folios are unavailable right now.");
    }
  };

  const act = async (patch) => {
    if (busy) return;
    setBusy(true);
    const ok = await onUpdate(item, patch);
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        aria-label="Render actions"
        aria-expanded={open}
        className="absolute -right-1.5 -bottom-1.5 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[var(--viz-line)] bg-[var(--viz-paper)] text-[11px] leading-none text-[var(--viz-ink)] group-hover:flex hover:border-[var(--viz-ink)]"
      >
        ⋯
      </button>

      {open && (
        <>
          {/* Click-away scrim — invisible; the popover is the only chrome. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="fixed z-50 overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)] py-1 shadow-lg"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ isFavorite: !item.isFavorite })}
              className={ROW_CLASS}
            >
              {item.isFavorite
                ? <span className="text-[var(--viz-blue)]">★ Favorited</span>
                : "☆ Favorite"}
            </button>

            <button
              type="button"
              onClick={loadFolios}
              aria-expanded={showFolios}
              className={ROW_CLASS}
            >
              File into folio…
            </button>

            {showFolios && (
              <div className="max-h-56 overflow-y-auto border-t border-[var(--viz-line)]">
                {folios === null
                  ? <p className="viz-mono px-3 py-2 text-[11px] text-[var(--viz-muted)]">
                      Opening the drawer…
                    </p>
                  : folios.length === 0
                    ? <p className="px-3 py-2 text-xs text-[var(--viz-muted)]">
                        {notice ?? (
                          <>
                            No folios yet —{" "}
                            <Link
                              href="/studio"
                              className="underline hover:text-[var(--viz-ink)]"
                            >
                              start one
                            </Link>
                            .
                          </>
                        )}
                      </p>
                    : folios.map((folio) => (
                        <div key={folio.id}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              act({ projectId: folio.id, roomId: null })
                            }
                            className={ROW_CLASS}
                          >
                            <span
                              className={
                                item.projectId === folio.id
                                  ? "text-[var(--viz-blue)]"
                                  : ""
                              }
                            >
                              {folio.name}
                            </span>
                          </button>
                          {folio.rooms.map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              disabled={busy}
                              onClick={() => act({ roomId: room.id })}
                              className={`${ROW_CLASS} pl-7 text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
                            >
                              <span
                                className={
                                  item.roomId === room.id
                                    ? "text-[var(--viz-blue)]"
                                    : ""
                                }
                              >
                                {room.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
              </div>
            )}

            {item.projectId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => act({ projectId: null })}
                className={`${ROW_CLASS} border-t border-[var(--viz-line)] text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
              >
                Remove from folio
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => act({ archived: true })}
              className={`${ROW_CLASS} border-t border-[var(--viz-line)] text-[var(--viz-muted)] hover:text-[var(--viz-ink)]`}
            >
              Archive
            </button>
          </div>
        </>
      )}
    </>
  );
}
