"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ASPECT_RATIOS,
  MAX_MOODBOARD_PRODUCTS,
} from "@/utils/visualizer/params";
import {
  composeLayout,
  extractPalette,
  hash01,
  shrinkDataUrl,
} from "./board/board-lib";
import PinningTable from "./board/PinningTable";
import { useBoard } from "./board/useBoard";
import NoticesBox from "./NoticesBox";
import ProductPickerModal from "./ProductPickerModal";
import { GeneratingOverlay } from "./RenderTab";
import { fileToDataUrl, IMAGE_TYPES, MAX_FILE_BYTES } from "./useVisualizerTab";

const HEX_RE = /^#?([0-9a-f]{6})$/i;

const railBtn =
  "w-full cursor-pointer rounded-md border border-[var(--viz-line)] bg-white p-2 text-left text-sm hover:bg-[var(--viz-ground)] disabled:cursor-default disabled:text-[var(--viz-muted)]";

/**
 * The Pinning Table — the mood-board workroom. A freeform paper board where
 * catalog products, color swatches, and notes are pinned, arranged, and then
 * developed into a generated board via the existing moodboard pipeline.
 */
export default function MoodboardTab() {
  const fieldId = useId();
  const {
    boards,
    loading,
    sketchMode,
    banner,
    board,
    items,
    setItems,
    saveState,
    savedAt,
    openBoard,
    createBoard,
    updateBoard,
    renameBoard,
    deleteBoard,
  } = useBoard();

  const [selectedId, setSelectedId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swatchOpen, setSwatchOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [generating, setGenerating] = useState({ state: false, message: "" });
  const [validationError, setValidationError] = useState(null);
  const [notices, setNotices] = useState([]);
  const paletteFileRef = useRef(null);
  const openedOnce = useRef(false);

  // Open the most recent board once the ledger arrives.
  useEffect(() => {
    if (loading || openedOnce.current || board || boards.length === 0) return;
    openedOnce.current = true;
    openBoard(boards[0].id);
  }, [loading, board, boards, openBoard]);

  const maxZ = () => items.reduce((m, i) => Math.max(m, i.z ?? 0), 0);

  const pinItem = (partial) => {
    const id = crypto.randomUUID();
    const item = {
      id,
      x: 0.5,
      y: 0.5,
      w: 0.25,
      h: null,
      rotation: (hash01(`${id}:rot`) * 2 - 1) * 4,
      z: maxZ() + 1,
      caption: null,
      props: {},
      ...partial,
    };
    setItems((prev) => [...prev, item]);
    setSelectedId(id);
    return item;
  };

  // --- Products -------------------------------------------------------------
  const productItems = items.filter((i) => i.kind === "product");

  const handleProductsPicked = (picked) => {
    setPickerOpen(false);
    setItems((prev) => {
      const kept = prev.filter(
        (item) =>
          item.kind !== "product" ||
          picked.some((p) => p.id === item.productId),
      );
      let z = kept.reduce((m, i) => Math.max(m, i.z ?? 0), 0);
      const additions = picked
        .filter((p) => !prev.some((item) => item.productId === p.id))
        .map((p, index) => {
          const id = crypto.randomUUID();
          return {
            id,
            kind: "product",
            productId: p.id,
            imageUrl: p.imageUrl,
            x: 0.32 + (index % 3) * 0.18,
            y: 0.3 + Math.floor(index / 3) * 0.28 + hash01(`${id}:y`) * 0.06,
            w: 0.2,
            h: null,
            rotation: (hash01(`${id}:rot`) * 2 - 1) * 4,
            z: ++z,
            caption: p.name ?? null,
            props: { name: p.name, brand: p.brand, price: p.price },
          };
        });
      return [...kept, ...additions];
    });
  };

  // --- Swatches & notes -------------------------------------------------------
  const addSwatch = (hex, label) => {
    const clean = `#${HEX_RE.exec(hex)?.[1]?.toLowerCase() ?? "cfc8b8"}`;
    pinItem({
      kind: "swatch",
      w: 0.09,
      x: 0.15 + hash01(`${clean}:${items.length}`) * 0.2,
      y: 0.75,
      props: { hex: clean, label: label ?? clean },
    });
    setSwatchOpen(false);
    setHexDraft("");
  };

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    pinItem({ kind: "text", w: 0.24, x: 0.2, y: 0.2, caption: text });
    setNoteDraft("");
    setNoteOpen(false);
  };

  // --- Palette ---------------------------------------------------------------
  const pullPalette = async (file) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES) {
      setValidationError("Please use a JPG, PNG, or WEBP under 10MB.");
      return;
    }
    setValidationError(null);
    try {
      const dataUrl = await fileToDataUrl(file, 512);
      const palette = await extractPalette(dataUrl, 5);
      updateBoard({ palette });
    } catch {
      setValidationError("Couldn't read colors from that photo.");
    }
  };

  // --- Compose for me ----------------------------------------------------------
  const composeForMe = () => {
    if (items.length === 0) {
      setValidationError(
        "Pin something first — products, swatches, or a note.",
      );
      return;
    }
    setValidationError(null);
    setItems((prev) => composeLayout(prev));
  };

  // --- Develop this board -------------------------------------------------------
  const setCoverFromRender = (boardId, renderId, attempt = 0) => {
    // The render persists via after() on the server — give it a moment, and
    // retry once if the row hasn't landed yet. Best-effort throughout.
    setTimeout(
      async () => {
        try {
          const res = await fetch(`/api/boards/${boardId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coverRenderId: renderId }),
          });
          if (res.status === 404 && attempt === 0) {
            setCoverFromRender(boardId, renderId, 1);
          }
        } catch {
          // Cover is cosmetic — never surface this.
        }
      },
      attempt === 0 ? 3500 : 8000,
    );
  };

  const developBoard = async () => {
    if (!board) return;
    const products = productItems
      .filter((i) => i.imageUrl)
      .slice(0, MAX_MOODBOARD_PRODUCTS);
    const noteTexts = items
      .filter((i) => i.kind === "text" && i.caption)
      .map((i) => i.caption);
    const swatchHexes = items
      .filter((i) => i.kind === "swatch" && i.props?.hex)
      .map((i) => i.props.hex);
    const palette = [
      ...new Set([...(board.palette ?? []), ...swatchHexes]),
    ].slice(0, 8);

    if (
      products.length === 0 &&
      noteTexts.length === 0 &&
      palette.length === 0
    ) {
      setValidationError(
        "Pin products, swatches, or a note first — the board's contents become the brief.",
      );
      return;
    }
    setValidationError(null);
    setNotices([]);
    setGenerating({ state: true, message: "Developing your board…" });

    const promptParts = ["Interior design mood board."];
    if (board.name && board.name !== "Untitled board") {
      promptParts.push(`Theme: "${board.name}".`);
    }
    if (noteTexts.length > 0) {
      promptParts.push(`Design intent: ${noteTexts.join("; ")}.`);
    }
    if (palette.length > 0) {
      promptParts.push(`Use this color palette: ${palette.join(", ")}.`);
    }

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "moodboard",
          prompt: promptParts.join(" ").slice(0, 2000),
          products: products.map((p) => ({ imageUrl: p.imageUrl })),
          params: { aspectRatio: board.aspect, creativity: "balanced" },
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        setValidationError("Please log in to develop a board.");
        return;
      }
      if (!response.ok || !data.success || !data.images?.[0]?.image) {
        setValidationError(
          data.error || "Nothing was produced. Please try again.",
        );
        return;
      }

      const generated = data.images[0];
      const fullDataUrl = `data:${generated.mimeType || "image/png"};base64,${generated.image}`;
      // Pinned copy is shrunk to respect the items API's 2MB data-URI cap;
      // the full-resolution render lives in history/storage.
      const pinnedUrl = await shrinkDataUrl(fullDataUrl, 1024);
      pinItem({
        kind: "image",
        imageUrl: pinnedUrl,
        w: 0.52,
        x: 0.5,
        y: 0.5,
        rotation: 0,
        caption: board.name,
        props: data.renderId ? { renderId: data.renderId } : {},
      });
      if (data.renderId && !sketchMode) {
        setCoverFromRender(board.id, data.renderId);
      }
      setNotices(Array.isArray(data.notices) ? data.notices : []);
    } catch {
      setValidationError(
        "An error occurred while developing. Please try again.",
      );
    } finally {
      setGenerating({ state: false, message: "" });
    }
  };

  // --- Save status line ---------------------------------------------------------
  const saveLine = sketchMode
    ? "Sketch — not saved"
    : saveState === "saving" || saveState === "dirty"
      ? "Saving…"
      : saveState === "error"
        ? "Save failed — retrying on next change"
        : savedAt
          ? `Saved · ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : null;

  const allNotices = [...(banner ? [banner] : []), ...notices];

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:gap-8">
      {/* The studio rail */}
      <aside className="lg:col-span-4">
        <div className="viz-panel p-4 sm:p-5">
          <h2 className="viz-serif text-2xl">The Pinning Table</h2>
          <p className="mt-1.5 text-xs text-[var(--viz-muted)]">
            Pin real products, swatches, and notes like samples on a worktable —
            then develop the board into one image.
          </p>

          {/* Boards ledger */}
          <div className="mt-5 flex items-baseline justify-between">
            <span className="viz-label">Boards</span>
            <button
              type="button"
              className="viz-mono cursor-pointer text-[11px] uppercase tracking-[0.08em] text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
              onClick={() => createBoard()}
            >
              + New board
            </button>
          </div>
          <ul className="mt-1.5 divide-y divide-[var(--viz-line)] border-y border-[var(--viz-line)]">
            {loading && (
              <li className="viz-mono py-2 text-[11px] text-[var(--viz-muted)]">
                Opening the flat files…
              </li>
            )}
            {!loading && boards.length === 0 && (
              <li className="viz-mono py-2 text-[11px] text-[var(--viz-muted)]">
                No boards yet — start one above.
              </li>
            )}
            {boards.map((b) => (
              <li key={b.id} className="flex items-center gap-2 py-1.5">
                {renamingId === b.id
                  ? <input
                      className="w-full rounded-md border border-[var(--viz-ink)] bg-white px-2 py-1 text-sm"
                      value={renameDraft}
                      // biome-ignore lint/a11y/noAutofocus: appears on explicit rename action
                      autoFocus
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={() => {
                        renameBoard(b.id, renameDraft);
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                    />
                  : <>
                      <button
                        type="button"
                        className={`min-w-0 flex-1 cursor-pointer truncate text-left text-sm hover:text-[var(--viz-ink)] ${
                          board?.id === b.id
                            ? "font-semibold text-[var(--viz-ink)]"
                            : "text-[var(--viz-muted)]"
                        }`}
                        onClick={() => openBoard(b.id)}
                      >
                        {b.name}
                      </button>
                      <span className="viz-mono shrink-0 text-[10px] text-[var(--viz-muted)]">
                        {b.itemCount ?? 0} pinned
                      </span>
                      <button
                        type="button"
                        aria-label={`Rename ${b.name}`}
                        className="viz-mono cursor-pointer text-[10px] text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
                        onClick={() => {
                          setRenamingId(b.id);
                          setRenameDraft(b.name);
                        }}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${b.name}`}
                        className="viz-mono cursor-pointer text-[10px] text-[var(--viz-muted)] hover:text-red-700"
                        onClick={() => deleteBoard(b.id)}
                      >
                        ✕
                      </button>
                    </>}
              </li>
            ))}
          </ul>

          {/* On the table */}
          <div className="viz-label mt-5">On the table</div>
          <div className="mt-1.5 space-y-2">
            <button
              type="button"
              className={railBtn}
              disabled={!board}
              onClick={() => setPickerOpen(true)}
            >
              + Add products{" "}
              <span className="viz-mono text-[10px] text-[var(--viz-muted)]">
                ({productItems.length}/{MAX_MOODBOARD_PRODUCTS} on board)
              </span>
            </button>

            <button
              type="button"
              className={railBtn}
              disabled={!board}
              onClick={() => {
                setSwatchOpen((v) => !v);
                setNoteOpen(false);
              }}
            >
              + Add swatch
            </button>
            {swatchOpen && board && (
              <div className="rounded-md border border-[var(--viz-line)] bg-white p-2.5">
                {(board.palette ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {board.palette.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Pin swatch ${hex}`}
                        className="h-7 w-7 cursor-pointer rounded-md border border-[rgba(38,34,26,0.2)] hover:scale-105"
                        style={{ backgroundColor: hex }}
                        onClick={() => addSwatch(hex)}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    aria-label="Hex color"
                    className="viz-mono w-full rounded-md border border-[var(--viz-line)] px-2 py-1.5 text-xs"
                    placeholder="#a3937c"
                    value={hexDraft}
                    onChange={(e) => setHexDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && HEX_RE.test(hexDraft)) {
                        addSwatch(hexDraft);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="viz-btn cursor-pointer rounded-md border border-[var(--viz-line)] px-3 hover:bg-[var(--viz-ground)] disabled:text-[var(--viz-muted)]"
                    disabled={!HEX_RE.test(hexDraft)}
                    onClick={() => addSwatch(hexDraft)}
                  >
                    Pin
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className={railBtn}
              disabled={!board}
              onClick={() => {
                setNoteOpen((v) => !v);
                setSwatchOpen(false);
              }}
            >
              + Add note
            </button>
            {noteOpen && board && (
              <div className="rounded-md border border-[var(--viz-line)] bg-white p-2.5">
                <textarea
                  aria-label="Note text"
                  className="viz-serif h-16 w-full resize-none rounded-md border border-[var(--viz-line)] px-2 py-1.5 text-sm italic"
                  placeholder="Quiet mornings, warm oak, unhurried light…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="viz-btn mt-1.5 w-full cursor-pointer rounded-md border border-[var(--viz-line)] py-1.5 hover:bg-[var(--viz-ground)] disabled:text-[var(--viz-muted)]"
                  disabled={!noteDraft.trim()}
                  onClick={addNote}
                >
                  Pin note
                </button>
              </div>
            )}
          </div>

          {/* Format */}
          <div className="mt-4">
            <label className="viz-label" htmlFor={`${fieldId}-format`}>
              Format
            </label>
            <select
              id={`${fieldId}-format`}
              className="viz-select mt-1.5 w-full rounded-md border border-[var(--viz-line)] bg-white px-2.5 py-2 text-sm disabled:text-[var(--viz-muted)]"
              value={board?.aspect ?? "4:3"}
              disabled={!board}
              onChange={(e) => updateBoard({ aspect: e.target.value })}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </option>
              ))}
            </select>
          </div>

          {/* Palette */}
          <div className="mt-4 flex items-baseline justify-between">
            <span className="viz-label">Palette</span>
            <button
              type="button"
              className="viz-mono cursor-pointer text-[11px] uppercase tracking-[0.08em] text-[var(--viz-muted)] hover:text-[var(--viz-ink)] disabled:cursor-default"
              disabled={!board}
              onClick={() => paletteFileRef.current?.click()}
            >
              Pull from a photo
            </button>
            <input
              ref={paletteFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Upload an inspiration photo to pull a palette"
              onChange={(e) => {
                pullPalette(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="mt-1.5 flex h-8 items-center gap-1.5">
            {(board?.palette ?? []).length === 0
              ? <p className="viz-mono text-[10px] text-[var(--viz-muted)]">
                  No palette yet — pull one from an inspiration photo.
                </p>
              : board.palette.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Pin swatch ${hex}`}
                    title={`${hex} — click to pin`}
                    className="h-7 flex-1 cursor-pointer rounded-md border border-[rgba(38,34,26,0.2)] transition-transform hover:-translate-y-0.5"
                    style={{ backgroundColor: hex }}
                    onClick={() => addSwatch(hex)}
                  />
                ))}
          </div>

          {/* Actions */}
          <div className="mt-5 space-y-2">
            <button
              type="button"
              className="viz-btn w-full cursor-pointer rounded-full border border-[var(--viz-line)] bg-white py-2.5 hover:bg-[var(--viz-ground)] disabled:cursor-default disabled:text-[var(--viz-muted)]"
              disabled={!board || items.length === 0}
              onClick={composeForMe}
            >
              Compose for me
            </button>
            <button
              type="button"
              className="viz-btn w-full cursor-pointer rounded-full bg-[var(--viz-ink)] py-2.5 text-[var(--viz-paper)] hover:opacity-90 disabled:cursor-default disabled:bg-[var(--viz-line)] disabled:text-[var(--viz-muted)]"
              disabled={!board || generating.state}
              onClick={developBoard}
            >
              Develop this board
            </button>
          </div>

          {saveLine && (
            <p className="viz-mono mt-3 text-[10px] uppercase tracking-[0.08em] text-[var(--viz-muted)]">
              {saveLine}
            </p>
          )}

          {validationError && (
            <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}
          <NoticesBox notices={allNotices} />
        </div>
      </aside>

      {/* The pinning table */}
      <section className="lg:col-span-8">
        {board
          ? <PinningTable
              aspect={board.aspect}
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onItemsChange={setItems}
            />
          : <div className="flex min-h-64 items-center justify-center rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)] p-8 lg:min-h-96">
              <div className="max-w-sm text-center">
                <p className="viz-serif text-xl italic text-[var(--viz-muted)]">
                  {loading
                    ? "Opening the flat files…"
                    : "Every scheme starts as a table of samples."}
                </p>
                {!loading && (
                  <button
                    type="button"
                    className="viz-btn mt-4 cursor-pointer rounded-full bg-[var(--viz-ink)] px-6 py-2.5 text-[var(--viz-paper)] hover:opacity-90"
                    onClick={() => createBoard()}
                  >
                    Start a board
                  </button>
                )}
              </div>
            </div>}
      </section>

      <ProductPickerModal
        open={pickerOpen}
        selected={productItems.map((item) => ({
          id: item.productId,
          name: item.props?.name ?? item.caption,
          imageUrl: item.imageUrl,
          brand: item.props?.brand ?? null,
          price: item.props?.price ?? null,
        }))}
        onConfirm={handleProductsPicked}
        onClose={() => setPickerOpen(false)}
      />

      {generating.state && <GeneratingOverlay message={generating.message} />}
    </div>
  );
}
