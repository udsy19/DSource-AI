"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import CadTab from "@/components/visualizer/CadTab";
import MoodboardTab from "@/components/visualizer/MoodboardTab";
import RenderTab from "@/components/visualizer/RenderTab";
import { UUID_PATTERN } from "@/utils/visualizer/folios";

const TABS = [
  { key: "render", label: "AI Render", component: RenderTab },
  { key: "moodboard", label: "Mood Board", component: MoodboardTab },
  { key: "cad", label: "Image to CAD", component: CadTab },
];

/**
 * Deep links: ?tab=render|moodboard|cad opens a tab; ?render=<uuid> fetches
 * that render and restores its full session (canvas, brief, edits,
 * materials), switching to the row's own mode.
 */
const VisualizerBoard = () => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const renderParam = searchParams.get("render");
  const restoreId =
    renderParam && UUID_PATTERN.test(renderParam) ? renderParam : null;

  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.key === tabParam) ? tabParam : "render",
  );
  const [restore, setRestore] = useState(null);

  useEffect(() => {
    if (!restoreId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/renders/${restoreId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.render) return;
        setRestore(data.render);
        if (TABS.some((t) => t.key === data.render.mode)) {
          setActiveTab(data.render.mode);
        }
      } catch {
        // A broken deep link opens the studio empty rather than failing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restoreId]);

  return (
    <div className="viz-scope w-full">
      <div className="mt-20 sm:mt-28 md:mt-32 lg:mt-36 px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Masthead folio: meta line over an ink rule; title and deck below,
            halftone drifting off the rule's right end */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/ai-material-finder/tutorial"
                className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
              >
                View tutorial →
              </Link>
            </div>
            <div className="relative pt-5">
              <span
                className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
                aria-hidden="true"
              />
              <span className="viz-dots-rule" aria-hidden="true" />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
                <h1 className="viz-serif text-4xl leading-none sm:text-5xl md:text-[3.6rem]">
                  AI Visualizer
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  Show us the room you have. We&rsquo;ll help you see the one
                  you imagined.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        {/* Sheet tabs attached to the board */}
        <div className="mt-8 flex gap-1 overflow-x-auto hide-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={`viz-mono shrink-0 cursor-pointer rounded-t-lg border border-b-0 px-5 py-2.5 text-xs font-semibold tracking-[0.08em] uppercase transition-colors duration-200 ${
                activeTab === tab.key
                  ? "border-[var(--viz-line)] bg-[var(--viz-ground)]"
                  : "border-transparent text-[var(--viz-muted)] hover:text-[var(--viz-ink)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* The board. Tabs stay mounted so uploads/params survive switching. */}
        <div className="viz-grain rounded-2xl rounded-tl-none border border-[var(--viz-line)] p-3 sm:p-5 lg:p-6">
          {TABS.map(({ key, component: TabComponent }) => (
            <div
              key={key}
              className={key === activeTab ? "viz-tab-enter" : "hidden"}
            >
              {/* Only the render tab can restore a session — the moodboard
                  workroom persists itself (boards) and CAD hands off. */}
              {key === "render"
                ? <TabComponent
                    restore={restore?.mode === "render" ? restore : null}
                    restoreId={restoreId}
                  />
                : <TabComponent />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// useSearchParams requires a Suspense boundary in a client page.
const AiVisualizer = () => (
  <Suspense fallback={null}>
    <VisualizerBoard />
  </Suspense>
);

export default AiVisualizer;
