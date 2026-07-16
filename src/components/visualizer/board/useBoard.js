"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State machine for The Pinning Table: the boards list, the open board and
 * its items, and a debounced autosave that syncs items in bulk.
 *
 * Sketch mode: when the boards API reports storage isn't provisioned (or the
 * user isn't logged in), everything runs local-only — the full board UI works,
 * nothing 500s, and a banner explains that nothing is being saved.
 */

const AUTOSAVE_DELAY_MS = 800;

const localBoard = (name = "Untitled board") => ({
  id: `sketch-${crypto.randomUUID()}`,
  name,
  aspect: "4:3",
  palette: null,
  coverUrl: null,
  updatedAt: new Date().toISOString(),
  itemCount: 0,
});

const isSketchId = (id) => typeof id === "string" && id.startsWith("sketch-");

export function useBoard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sketchMode, setSketchMode] = useState(false);
  const [banner, setBanner] = useState(null);
  const [board, setBoard] = useState(null);
  const [items, setItemsState] = useState([]);
  // "idle" | "dirty" | "saving" | "saved" | "error" | "sketch"
  const [saveState, setSaveState] = useState("idle");
  const [savedAt, setSavedAt] = useState(null);

  const deletedIdsRef = useRef([]);
  const saveTimerRef = useRef(null);
  const itemsRef = useRef(items);
  const boardRef = useRef(board);
  itemsRef.current = items;
  boardRef.current = board;

  const enterSketchMode = useCallback((message) => {
    setSketchMode(true);
    setBanner(message);
    setSaveState("sketch");
    const first = localBoard();
    setBoards([first]);
    setBoard(first);
    setItemsState([]);
  }, []);

  // --- Initial load -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/boards");
        if (cancelled) return;
        if (res.status === 401) {
          enterSketchMode("Log in to save boards — this sketch stays local.");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.notice) {
          enterSketchMode(
            "Boards aren't saved yet — provisioning storage. Keep pinning; nothing will error.",
          );
          return;
        }
        setBoards(data.boards ?? []);
      } catch {
        if (!cancelled) {
          enterSketchMode(
            "Boards aren't saved yet — provisioning storage. Keep pinning; nothing will error.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(saveTimerRef.current);
    };
  }, [enterSketchMode]);

  // --- Autosave -----------------------------------------------------------
  const syncItems = useCallback(async () => {
    const activeBoard = boardRef.current;
    if (!activeBoard || isSketchId(activeBoard.id)) return;
    setSaveState("saving");
    const deletedIds = deletedIdsRef.current;
    deletedIdsRef.current = [];
    try {
      const res = await fetch(`/api/boards/${activeBoard.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsRef.current.map((item) => ({
            id: item.id,
            kind: item.kind,
            productId: item.productId ?? null,
            imageUrl: item.imageUrl ?? null,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h ?? null,
            rotation: item.rotation ?? 0,
            z: item.z ?? 0,
            caption: item.caption ?? null,
            props: item.props ?? {},
          })),
          deletedIds,
        }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaveState("saved");
      setSavedAt(new Date());
    } catch {
      // Re-queue the deletions we optimistically flushed.
      deletedIdsRef.current = [...deletedIds, ...deletedIdsRef.current];
      setSaveState("error");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (sketchMode || !boardRef.current) return;
    setSaveState("dirty");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(syncItems, AUTOSAVE_DELAY_MS);
  }, [sketchMode, syncItems]);

  /** All item mutations funnel through here so every change autosaves. */
  const setItems = useCallback(
    (updater) => {
      setItemsState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        for (const item of prev) {
          if (!next.some((n) => n.id === item.id)) {
            deletedIdsRef.current.push(item.id);
          }
        }
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  // --- Board CRUD ---------------------------------------------------------
  const openBoard = useCallback(
    async (id) => {
      clearTimeout(saveTimerRef.current);
      deletedIdsRef.current = [];
      if (sketchMode || isSketchId(id)) {
        const target = boards.find((b) => b.id === id);
        if (target) {
          setBoard(target);
          setItemsState(target.sketchItems ?? []);
        }
        return;
      }
      try {
        const res = await fetch(`/api/boards/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        setBoard(data.board);
        setItemsState(data.items ?? []);
        setSaveState("idle");
      } catch {
        // Leave the current board open.
      }
    },
    [sketchMode, boards],
  );

  const createBoard = useCallback(
    async (name, { projectId } = {}) => {
      if (sketchMode) {
        const next = localBoard(name);
        setBoards((prev) => [next, ...prev]);
        setBoard(next);
        setItemsState([]);
        return next;
      }
      try {
        const res = await fetch("/api/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(name ? { name } : {}),
            ...(projectId ? { projectId } : {}),
          }),
        });
        if (res.status === 503) {
          enterSketchMode(
            "Boards aren't saved yet — provisioning storage. Keep pinning; nothing will error.",
          );
          return null;
        }
        if (!res.ok) return null;
        const data = await res.json();
        setBoards((prev) => [data.board, ...prev]);
        setBoard(data.board);
        setItemsState([]);
        setSaveState("idle");
        return data.board;
      } catch {
        return null;
      }
    },
    [sketchMode, enterSketchMode],
  );

  /** Persists board fields (name / aspect / palette / cover). */
  const updateBoard = useCallback(
    async (patch) => {
      const activeBoard = boardRef.current;
      if (!activeBoard) return;
      // Optimistic local apply (coverRenderId is server-resolved, skip it).
      const { coverRenderId: _ignored, ...local } = patch;
      setBoard((prev) => (prev ? { ...prev, ...local } : prev));
      setBoards((prev) =>
        prev.map((b) => (b.id === activeBoard.id ? { ...b, ...local } : b)),
      );
      if (sketchMode || isSketchId(activeBoard.id)) return;
      try {
        await fetch(`/api/boards/${activeBoard.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } catch {
        // Optimistic state stands; the next sync will surface real failures.
      }
    },
    [sketchMode],
  );

  /** Renames any board in the list (not just the open one). */
  const renameBoard = useCallback(
    async (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setBoards((prev) =>
        prev.map((b) => (b.id === id ? { ...b, name: trimmed } : b)),
      );
      setBoard((prev) => (prev?.id === id ? { ...prev, name: trimmed } : prev));
      if (sketchMode || isSketchId(id)) return;
      try {
        await fetch(`/api/boards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
      } catch {
        // Optimistic rename stands; reload reconciles.
      }
    },
    [sketchMode],
  );

  const deleteBoard = useCallback(
    async (id) => {
      setBoards((prev) => prev.filter((b) => b.id !== id));
      if (boardRef.current?.id === id) {
        setBoard(null);
        setItemsState([]);
      }
      if (sketchMode || isSketchId(id)) return;
      try {
        await fetch(`/api/boards/${id}`, { method: "DELETE" });
      } catch {
        // Already removed locally; a stale row reappears on next load.
      }
    },
    [sketchMode],
  );

  // Keep sketch items attached to their board so switching boards in sketch
  // mode doesn't lose work.
  useEffect(() => {
    if (!sketchMode || !board) return;
    setBoards((prev) =>
      prev.map((b) =>
        b.id === board.id
          ? { ...b, sketchItems: items, itemCount: items.length }
          : b,
      ),
    );
  }, [sketchMode, board, items]);

  return {
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
  };
}
