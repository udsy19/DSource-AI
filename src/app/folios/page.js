"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import FolioCard from "@/components/folios/FolioCard";
import NewFolioForm from "@/components/folios/NewFolioForm";
import Reveal from "@/components/Reveal";
import NoticesBox from "@/components/visualizer/NoticesBox";

/**
 * The folio index — one folio per home or client. Renders filed from the
 * visualizer land here; everything unfiled stays on the studio floor.
 */
export default function FoliosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState(null); // null = loading
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json().catch(() => ({}));
      setProjects(data.projects ?? []);
      setNotice(data.notice ?? null);
    } catch {
      setProjects([]);
      setNotice("Folios are unavailable right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="viz-scope w-full">
      <div className="mx-auto mt-20 min-h-[60vh] max-w-[1728px] px-4 pb-20 sm:mt-28 sm:px-6 md:mt-32 md:px-8 lg:mt-36 lg:px-12">
        {/* Masthead folio: meta line over an ink rule; title and deck below */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/ai-visualizer?tab=render"
                className="viz-label shrink-0 hover:text-[var(--viz-ink)]"
              >
                Open the visualizer →
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
                  Folios
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  One folio per home. Every render filed where it belongs.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        <NoticesBox notices={notice ? [notice] : []} />

        <div className="mt-8 flex items-baseline justify-between gap-4">
          <p className="viz-label">
            {projects === null
              ? "Opening the drawer…"
              : `${String(projects.length).padStart(2, "0")} ${
                  projects.length === 1 ? "folio" : "folios"
                }`}
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="viz-btn cursor-pointer rounded-full bg-[var(--viz-ink)] px-5 py-2.5 text-[var(--viz-paper)] transition-colors hover:bg-black"
            >
              New folio
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-4">
            <NewFolioForm
              onCreated={(project) => router.push(`/folios/${project.id}`)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {projects !== null &&
          (projects.length === 0
            ? !showForm && (
                <p className="viz-mono mt-10 text-xs text-[var(--viz-muted)]">
                  No folios yet — start one for the home you&rsquo;re designing,
                  then file renders into it from the visualizer.
                </p>
              )
            : <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <FolioCard key={project.id} project={project} />
                ))}
              </div>)}
      </div>
    </div>
  );
}
