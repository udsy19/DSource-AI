"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// SVG is deliberately not accepted: the image-edit models reject SVG input.
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Reads a file as a data URL, downscaling to maxDim on the long edge as
 * JPEG. Phone photos are commonly 4000px/8MB — sending them raw made every
 * generate pay seconds of upload for resolution the models resample away
 * anyway. Falls back to the raw file if decoding fails.
 */
export const fileToDataUrl = (file, maxDim = 2048) =>
  new Promise((resolve) => {
    const readRaw = () => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    };
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale === 1 && file.type !== "image/png") {
        readRaw();
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      readRaw();
    };
    img.src = url;
  });

/**
 * Shared state machine for a visualizer tab (render / moodboard / cad):
 * upload handling, generation flow, notices, and per-mode history.
 */
export function useVisualizerTab({ mode }) {
  const [originalUpload, setOriginalUpload] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const abortRef = useRef(null);

  const [isGenerating, setIsGenerating] = useState({
    state: false,
    message: "",
  });
  const [validationError, setValidationError] = useState(null);
  const [error, setError] = useState(null);
  const [notices, setNotices] = useState([]);
  // Adherence result for the render currently on the canvas (null when the
  // canvas shows an upload or a history item rather than a fresh render).
  const [adherence, setAdherence] = useState(null);

  const [sessionHistory, setSessionHistory] = useState([]);
  const [serverHistory, setServerHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const acceptImageFile = (file) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a valid image file (JPG, PNG, or WEBP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File size must be less than 10MB.");
      return;
    }
    setError(null);
    fileToDataUrl(file).then((dataUrl) => {
      setOriginalUpload(dataUrl);
      setImagePreview(dataUrl);
      setActiveHistoryId(null);
      setAdherence(null);
    });
  };

  const removeImage = () => {
    setOriginalUpload(null);
    setImagePreview(null);
    setActiveHistoryId(null);
    setError(null);
    setNotices([]);
    setAdherence(null);
  };

  const resetToOriginal = () => {
    setImagePreview(originalUpload);
    setActiveHistoryId(null);
    setAdherence(null);
  };

  const fetchServerHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/renders?mode=${mode}`);
      if (!res.ok) return;
      const data = await res.json();
      setServerHistory(
        (data.renders ?? []).map((r) => ({ ...r, persisted: true })),
      );
      if (data.notice) {
        setNotices((prev) =>
          prev.includes(data.notice) ? prev : [...prev, data.notice],
        );
      }
    } catch {
      // History is optional — never block the tab on it.
    }
  }, [mode]);

  useEffect(() => {
    fetchServerHistory();
    return () => abortRef.current?.abort();
  }, [fetchServerHistory]);

  const handleHistorySelect = (item) => {
    setImagePreview(item.imageUrl);
    setActiveHistoryId(item.id);
    setAdherence(null);
  };

  /**
   * PATCHes folio metadata (favorite / file into folio / archive) for a
   * persisted render and mirrors the change into local history state.
   * @returns {Promise<boolean>} success — the menu closes only on true.
   */
  const handleHistoryUpdate = async (item, patch) => {
    try {
      const res = await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Pre-migration DBs answer 503 with a migration notice — surface it.
        if (data.error) {
          setNotices((prev) =>
            prev.includes(data.error) ? prev : [...prev, data.error],
          );
        }
        return false;
      }
      const updated = data.render ?? {};
      const apply = (list) =>
        updated.archived
          ? list.filter((r) => r.id !== item.id)
          : list.map((r) => (r.id === item.id ? { ...r, ...updated } : r));
      setServerHistory(apply);
      setSessionHistory(apply);
      if (updated.archived && activeHistoryId === item.id) {
        setActiveHistoryId(null);
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleHistoryDelete = async (item) => {
    try {
      const res = await fetch(`/api/renders/${item.id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        setServerHistory((prev) => prev.filter((r) => r.id !== item.id));
        if (activeHistoryId === item.id) setActiveHistoryId(null);
      }
    } catch {
      // Leave the item in place if deletion failed.
    }
  };

  /**
   * Shared generation flow. The tab supplies the request body (minus mode);
   * the hook handles transport, errors, history, and notices.
   */
  const generate = async ({ body, message, promptForHistory }) => {
    setValidationError(null);
    setError(null);
    setNotices([]);
    setIsGenerating({ state: true, message });

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, mode }),
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.status === 401) {
        setValidationError("Please log in to generate.");
        return;
      }
      if (!response.ok) {
        setValidationError(
          data.error || "Failed to generate. Please try again.",
        );
        return;
      }

      const generated = data.images?.[0];
      if (!data.success || !generated?.image) {
        setError("Nothing was produced. Please try again.");
        return;
      }

      const dataUrl = `data:${generated.mimeType || "image/png"};base64,${
        generated.image
      }`;
      setImagePreview(dataUrl);
      setAdherence(data.adherence ?? null);

      const historyItem = {
        id: data.renderId ?? `session-${Date.now()}`,
        imageUrl: dataUrl,
        prompt: promptForHistory ?? null,
        model: data.model,
        persisted: Boolean(data.renderId),
        createdAt: new Date().toISOString(),
        // Fresh persisted renders start unfiled/unstarred so folio actions
        // are available immediately without refetching history.
        ...(data.renderId
          ? { projectId: null, roomId: null, isFavorite: false }
          : {}),
      };
      setSessionHistory((prev) => [historyItem, ...prev]);
      setActiveHistoryId(historyItem.id);

      const serverNotices = Array.isArray(data.notices) ? data.notices : [];
      if (data.adherence?.retried) {
        serverNotices.unshift(
          "We automatically retried once to better match your parameters.",
        );
      }
      setNotices(serverNotices);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error(`Error generating (${mode}):`, err);
      setError("An error occurred while generating. Please try again.");
    } finally {
      setIsGenerating({ state: false, message: "" });
    }
  };

  return {
    // image state
    originalUpload,
    imagePreview,
    acceptImageFile,
    removeImage,
    resetToOriginal,
    canResetToOriginal: Boolean(
      originalUpload && imagePreview && imagePreview !== originalUpload,
    ),
    // flow state
    isGenerating,
    validationError,
    setValidationError,
    error,
    notices,
    generate,
    // True only when the current render was vision-checked against the
    // brief and every checked parameter passed.
    isVerified: Boolean(
      adherence &&
        !adherence.skipped &&
        (adherence.checked?.length ?? 0) > 0 &&
        (adherence.failures?.length ?? 0) === 0,
    ),
    // history
    historyItems: [...sessionHistory, ...serverHistory],
    activeHistoryId,
    handleHistorySelect,
    handleHistoryDelete,
    handleHistoryUpdate,
  };
}
