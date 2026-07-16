"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { renderCountLabel } from "@/components/folios/FolioCard";
import Reveal from "@/components/Reveal";
import NoticesBox from "@/components/visualizer/NoticesBox";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-3 py-2.5 text-sm focus:border-[var(--viz-ink)] focus:outline-none";

const QUIET_ACTION =
  "viz-mono cursor-pointer text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]";

const patchJson = (url, body, method = "PATCH") =>
  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/**
 * One folio: editable name/meta, rooms, and the renders filed into it,
 * grouped by room with an Unfiled section. Per-render actions: move to a
 * room, favorite, archive, set as cover, open in the visualizer.
 */
export default function FolioDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [project, setProject] = useState(undefined); // undefined = loading
  const [renders, setRenders] = useState([]);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [projectsRes, rendersRes] = await Promise.all([
        fetch("/api/projects"),
        fetch(`/api/renders?projectId=${id}&limit=100`),
      ]);
      const projectsData = await projectsRes.json().catch(() => ({}));
      const rendersData = await rendersRes.json().catch(() => ({}));
      const found =
        (projectsData.projects ?? []).find((p) => p.id === id) ?? null;
      setProject(found);
      setRenders(rendersData.renders ?? []);
      setNotice(projectsData.notice ?? rendersData.notice ?? null);
    } catch {
      setProject(null);
      setNotice("Folios are unavailable right now.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const fail = async (res, fallback) => {
    const data = await res.json().catch(() => ({}));
    setActionError(data.error || fallback);
  };

  // --- Render actions -----------------------------------------------------

  const updateRender = async (render, patch) => {
    setActionError(null);
    const res = await patchJson(`/api/renders/${render.id}`, patch);
    if (!res.ok) {
      await fail(res, "Could not update the render.");
      return;
    }
    const { render: updated } = await res.json();
    setRenders((prev) =>
      updated.archived
        ? prev.filter((r) => r.id !== render.id)
        : prev.map((r) => (r.id === render.id ? { ...r, ...updated } : r)),
    );
  };

  const setCover = async (render) => {
    setActionError(null);
    const res = await patchJson(`/api/projects/${id}`, {
      coverRenderId: render.id,
    });
    if (!res.ok) {
      await fail(res, "Could not set the cover.");
      return;
    }
    setProject((prev) => ({ ...prev, coverRenderId: render.id }));
  };

  // --- Folio meta / lifecycle ---------------------------------------------

  const saveMeta = async (fields) => {
    setActionError(null);
    const res = await patchJson(`/api/projects/${id}`, fields);
    if (!res.ok) {
      await fail(res, "Could not save the folio details.");
      return false;
    }
    const { project: updated } = await res.json();
    setProject((prev) => ({ ...prev, ...updated }));
    return true;
  };

  const archiveFolio = async () => {
    if (await saveMeta({ status: "archived" })) router.push("/folios");
  };

  const deleteFolio = async () => {
    if (
      !window.confirm(
        "Delete this folio? Its renders return to the studio floor.",
      )
    ) {
      return;
    }
    setActionError(null);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      await fail(res, "Could not delete the folio.");
      return;
    }
    router.push("/folios");
  };

  // --- Rooms ----------------------------------------------------------------

  const addRoom = async (name) => {
    setActionError(null);
    const res = await patchJson(`/api/projects/${id}/rooms`, { name }, "POST");
    if (!res.ok) {
      await fail(res, "Could not add the room.");
      return false;
    }
    const { room } = await res.json();
    setProject((prev) => ({ ...prev, rooms: [...prev.rooms, room] }));
    return true;
  };

  const renameRoom = async (roomId, name) => {
    setActionError(null);
    const res = await patchJson(`/api/projects/${id}/rooms`, { roomId, name });
    if (!res.ok) {
      await fail(res, "Could not rename the room.");
      return false;
    }
    setProject((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, name } : r)),
    }));
    return true;
  };

  const removeRoom = async (roomId) => {
    setActionError(null);
    const res = await patchJson(
      `/api/projects/${id}/rooms`,
      { roomId },
      "DELETE",
    );
    if (!res.ok && res.status !== 404) {
      await fail(res, "Could not remove the room.");
      return;
    }
    setProject((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
    }));
    // Their renders stay in the folio, unfiled (FK sets room_id null).
    setRenders((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, roomId: null } : r)),
    );
  };

  // --- Layout ----------------------------------------------------------------

  const metaLine = project
    ? [project.clientName, project.address].filter(Boolean).join(" · ")
    : "";
  const unfiled = renders.filter((r) => !r.roomId);

  return (
    <div className="viz-scope w-full">
      <div className="mx-auto mt-20 min-h-[60vh] max-w-[1728px] px-4 pb-20 sm:mt-28 sm:px-6 md:mt-32 md:px-8 lg:mt-36 lg:px-12">
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio — Folio</p>
              <Link
                href="/folios"
                className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
              >
                ← All folios
              </Link>
            </div>
            <div className="relative pt-5">
              <span
                className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
                aria-hidden="true"
              />
              <span className="viz-dots-rule" aria-hidden="true" />
              {project === undefined
                ? <p className="viz-mono text-xs text-[var(--viz-muted)]">
                    Opening the folio…
                  </p>
                : project === null
                  ? <p className="viz-serif text-2xl italic text-[var(--viz-muted)]">
                      This folio isn&rsquo;t here — it may have been archived or
                      removed.
                    </p>
                  : <FolioHeading
                      project={project}
                      metaLine={metaLine}
                      renderCount={renders.length}
                      onSave={saveMeta}
                      onArchive={archiveFolio}
                      onDelete={deleteFolio}
                    />}
            </div>
          </Reveal>
        </header>

        <NoticesBox notices={notice ? [notice] : []} />
        {actionError && (
          <p className="mt-3 text-xs text-red-700">{actionError}</p>
        )}

        {project && (
          <>
            <RoomManager rooms={project.rooms} onAdd={addRoom} />

            {renders.length === 0
              ? <p className="viz-mono mt-8 text-xs text-[var(--viz-muted)]">
                  Nothing filed yet — open a render&rsquo;s ⋯ menu in the{" "}
                  <Link
                    href="/ai-visualizer"
                    className="underline hover:text-[var(--viz-ink)]"
                  >
                    visualizer
                  </Link>{" "}
                  and choose &ldquo;File into folio&rdquo;.
                </p>
              : <div className="mt-8 space-y-10">
                  {project.rooms.map((room) => (
                    <RoomSection
                      key={room.id}
                      room={room}
                      renders={renders.filter((r) => r.roomId === room.id)}
                      project={project}
                      onRename={renameRoom}
                      onRemove={removeRoom}
                      onRenderUpdate={updateRender}
                      onSetCover={setCover}
                    />
                  ))}
                  <RoomSection
                    room={null}
                    renders={unfiled}
                    project={project}
                    onRenderUpdate={updateRender}
                    onSetCover={setCover}
                  />
                </div>}
          </>
        )}
      </div>
    </div>
  );
}

/** Serif folio name + mono meta, with inline edit and quiet lifecycle actions. */
function FolioHeading({
  project,
  metaLine,
  renderCount,
  onSave,
  onArchive,
  onDelete,
}) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName ?? "");
  const [address, setAddress] = useState(project.address ?? "");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(project.name);
    setClientName(project.clientName ?? "");
    setAddress(project.address ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      clientName: clientName.trim() || null,
      address: address.trim() || null,
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <div className="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-name`} className="viz-label">
              Name
            </label>
            <input
              id={`${uid}-name`}
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-client`} className="viz-label">
              Client
            </label>
            <input
              id={`${uid}-client`}
              type="text"
              value={clientName}
              maxLength={120}
              onChange={(e) => setClientName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-address`} className="viz-label">
              City / address
            </label>
            <input
              id={`${uid}-address`}
              type="text"
              value={address}
              maxLength={160}
              onChange={(e) => setAddress(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-5">
          <button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
            className="viz-btn cursor-pointer rounded-full bg-[var(--viz-ink)] px-6 py-2.5 text-[var(--viz-paper)] transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
          >
            {saving ? "Saving…" : "Save details"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={QUIET_ACTION}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
      <h1 className="viz-serif text-4xl leading-none sm:text-5xl md:text-[3.6rem]">
        {project.name}
      </h1>
      <div className="flex flex-col gap-2 pb-1 lg:items-end">
        <p className="viz-label">
          {metaLine ? `${metaLine} · ` : ""}
          {renderCountLabel(renderCount)}
        </p>
        <div className="flex items-center gap-5">
          <button type="button" onClick={startEdit} className={QUIET_ACTION}>
            Edit details
          </button>
          <button type="button" onClick={onArchive} className={QUIET_ACTION}>
            Archive folio
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`${QUIET_ACTION} hover:text-red-700`}
          >
            Delete folio
          </button>
        </div>
      </div>
    </div>
  );
}

/** Quiet "add a room" affordance — a mono action that unfolds an inline input. */
function RoomManager({ rooms, onAdd }) {
  const uid = useId();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    const ok = await onAdd(name.trim());
    setSaving(false);
    if (ok) {
      setName("");
      setAdding(false);
    }
  };

  return (
    <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-[var(--viz-line)] pb-3">
      <p className="viz-label">
        Rooms — {String(rooms.length).padStart(2, "0")}
      </p>
      {rooms.map((room) => (
        <span key={room.id} className="viz-mono text-xs text-[var(--viz-ink)]">
          {room.name}
        </span>
      ))}
      {adding
        ? <form onSubmit={submit} className="flex items-center gap-3">
            <label htmlFor={`${uid}-room`} className="sr-only">
              Room name
            </label>
            <input
              id={`${uid}-room`}
              type="text"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Living room"
              className="rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-1.5 text-xs focus:border-[var(--viz-ink)] focus:outline-none"
              // Appears on request — focus follows the user's intent.
              // biome-ignore lint/a11y/noAutofocus: intentional — the input appears on request
              autoFocus
            />
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className={QUIET_ACTION}
            >
              {saving ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={QUIET_ACTION}
            >
              Cancel
            </button>
          </form>
        : <button
            type="button"
            onClick={() => setAdding(true)}
            className={QUIET_ACTION}
          >
            + Add room
          </button>}
    </div>
  );
}

/** A room's shelf of renders (room = null renders the Unfiled section). */
function RoomSection({
  room,
  renders,
  project,
  onRename,
  onRemove,
  onRenderUpdate,
  onSetCover,
}) {
  const uid = useId();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(room?.name ?? "");

  // Empty Unfiled section carries no information — skip it.
  if (!room && renders.length === 0) return null;

  const submitRename = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (await onRename(room.id, name.trim())) setRenaming(false);
  };

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        {renaming
          ? <form onSubmit={submitRename} className="flex items-center gap-3">
              <label htmlFor={`${uid}-rename`} className="sr-only">
                Room name
              </label>
              <input
                id={`${uid}-rename`}
                type="text"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-1.5 text-xs focus:border-[var(--viz-ink)] focus:outline-none"
                // Appears on request — focus follows the user's intent.
                // biome-ignore lint/a11y/noAutofocus: intentional — the input appears on request
                autoFocus
              />
              <button type="submit" className={QUIET_ACTION}>
                Save
              </button>
              <button
                type="button"
                onClick={() => setRenaming(false)}
                className={QUIET_ACTION}
              >
                Cancel
              </button>
            </form>
          : <>
              <h2 className="viz-serif text-2xl">
                {room ? room.name : "Unfiled"}
              </h2>
              <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                {renderCountLabel(renders.length)}
              </p>
              {room && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setName(room.name);
                      setRenaming(true);
                    }}
                    className={QUIET_ACTION}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(room.id)}
                    className={QUIET_ACTION}
                  >
                    Remove room
                  </button>
                </>
              )}
            </>}
      </div>

      {renders.length === 0
        ? <p className="viz-mono mt-3 text-xs text-[var(--viz-muted)]">
            Nothing filed under this room yet.
          </p>
        : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {renders.map((render) => (
              <RenderCard
                key={render.id}
                render={render}
                project={project}
                onUpdate={onRenderUpdate}
                onSetCover={onSetCover}
              />
            ))}
          </div>}
    </section>
  );
}

/** One filed render: thumbnail plate + quiet mono actions. */
function RenderCard({ render, project, onUpdate, onSetCover }) {
  const uid = useId();
  const isCover = project.coverRenderId === render.id;
  const date = new Date(render.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  return (
    <article className="viz-panel overflow-hidden">
      <div className="relative aspect-[4/3] border-b border-[var(--viz-line)] bg-[var(--viz-ground)]">
        {/* Signed URLs are short-lived — next/image can't optimize them. */}
        {/* biome-ignore lint/performance/noImgElement: signed URLs cannot use next/image */}
        <img
          src={render.imageUrl}
          alt={render.prompt || "Filed render"}
          className="h-full w-full object-cover"
        />
        {isCover && (
          <span className="viz-mono absolute top-2 left-2 rounded bg-[var(--viz-paper)]/90 px-1.5 py-0.5 text-[10px] tracking-[0.08em] text-[var(--viz-blue)] uppercase">
            Cover
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p
            className="viz-mono truncate text-[11px] text-[var(--viz-muted)]"
            title={render.prompt || undefined}
          >
            {date}
            {render.prompt ? ` · ${render.prompt}` : ""}
          </p>
          <button
            type="button"
            onClick={() => onUpdate(render, { isFavorite: !render.isFavorite })}
            aria-pressed={render.isFavorite}
            aria-label={
              render.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            className={`cursor-pointer text-base leading-none transition-colors ${
              render.isFavorite
                ? "text-[var(--viz-blue)]"
                : "text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
            }`}
          >
            {render.isFavorite ? "★" : "☆"}
          </button>
        </div>

        <div className="mt-2">
          <label htmlFor={`${uid}-room`} className="sr-only">
            Room
          </label>
          <select
            id={`${uid}-room`}
            value={render.roomId ?? ""}
            onChange={(e) =>
              onUpdate(render, { roomId: e.target.value || null })
            }
            className="viz-select viz-mono w-full cursor-pointer rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-1.5 text-[11px]"
          >
            <option value="">Unfiled</option>
            {project.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {!isCover && (
              <button
                type="button"
                onClick={() => onSetCover(render)}
                className={`${QUIET_ACTION} text-[10px]`}
              >
                Set cover
              </button>
            )}
            <button
              type="button"
              onClick={() => onUpdate(render, { archived: true })}
              className={`${QUIET_ACTION} text-[10px]`}
            >
              Archive
            </button>
          </div>
          <Link
            href="/ai-visualizer"
            className={`${QUIET_ACTION} text-[10px] no-underline`}
          >
            Open →
          </Link>
        </div>
      </div>
    </article>
  );
}
