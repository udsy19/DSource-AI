"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Drives the NDJSON search stream.
 *
 * The search takes 30-60s across several providers, so the route streams stage
 * events and this hook turns them into something the page can narrate. Same
 * reader shape as the visualizer's render tab: getReader + TextDecoder, buffer
 * and split on newline, since a chunk can straddle events.
 */

const STAGE_COPY = {
  identify: {
    url: "Reading the listing",
    image: "Reading the photo",
  },
  identified: "Identified the product",
  search: "Searching",
  verify: "Checking each seller",
};

export const useMaterialFinder = () => {
  const [status, setStatus] = useState("idle");
  const [stage, setStage] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setStage(null);
    setIdentity(null);
    setResult(null);
    setError(null);
  }, []);

  const search = useCallback(async ({ url, image }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("searching");
    setStage({ label: url ? "Reading the listing" : "Reading the photo" });
    setIdentity(null);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/material-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(url ? { url } : { image }),
        signal: controller.signal,
      });

      // Validation and auth errors come back as plain JSON with a real status
      // — only the pipeline itself streams.
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "The search failed. Please try again.");
        setStatus("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // The last piece may be a partial event — keep it for the next chunk.
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          handleEvent(event, {
            setStage,
            setIdentity,
            setResult,
            setError,
            setStatus,
          });
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("The search failed. Please try again.");
      setStatus("error");
    }
  }, []);

  return { status, stage, identity, result, error, search, reset };
};

const handleEvent = (event, setters) => {
  const { setStage, setIdentity, setResult, setError, setStatus } = setters;

  if (event.done) {
    if (event.success) {
      setResult(event);
      setStatus("done");
    } else {
      setError(event.error ?? "The search failed.");
      setStatus("error");
    }
    setStage(null);
    return;
  }

  if (event.stage === "identified") {
    setIdentity(event.identity);
    setStage({ label: STAGE_COPY.identified });
    return;
  }

  if (event.stage === "search") {
    setStage({ label: `${STAGE_COPY.search} ${event.provider}` });
    return;
  }

  if (event.stage === "verify") {
    setStage({ label: `${STAGE_COPY.verify} — ${event.count} found so far` });
    return;
  }

  if (event.stage === "identify") {
    setStage({ label: STAGE_COPY.identify[event.via] ?? "Reading" });
  }
};
