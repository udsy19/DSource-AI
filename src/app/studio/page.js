"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import FolioCard from "@/components/folios/FolioCard";
import NewFolioForm from "@/components/folios/NewFolioForm";
import Reveal from "@/components/Reveal";
import NoticesBox from "@/components/visualizer/NoticesBox";

const QUIET_ACTION =
  "viz-mono text-[11px] tracking-[0.08em] uppercase text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]";

/** "14 Jul" — the spec-sheet date voice used across the folio pages. */
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

// The three working surfaces — one line each, stated plainly.
const TOOLS = [
  {
    href: "/ai-visualizer",
    name: "Product",
    line: "Bring a photo of a room; render the one you imagined.",
  },
  {
    href: "/ai-visualizer?tab=moodboard",
    name: "Mood boards",
    line: "Compose materials, palette, and mood on one board.",
  },
  {
    href: "/cad-studio",
    name: "CAD studio",
    line: "Turn a plan or sketch into an editable CAD drawing.",
  },
];

/**
 * The studio home — the signed-in front door. Picks up the latest render,
 * the folios, the three tools, and the recent shelf. All real data; the
 * first visit gets the invitation instead.
 */
export default function StudioPage() {
  const [renders, setRenders] = useState(null); // null = loading
  const [projects, setProjects] = useState(null);
  const [notice, setNotice] = useState(null);
  const [newFolioOpen, setNewFolioOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rendersRes, projectsRes] = await Promise.all([
        fetch("/api/renders?limit=8"),
        fetch("/api/projects"),
      ]);
      const rendersData = await rendersRes.json().catch(() => ({}));
      const projectsData = await projectsRes.json().catch(() => ({}));
      setRenders(rendersData.renders ?? []);
      setProjects(projectsData.projects ?? []);
      setNotice(rendersData.notice ?? projectsData.notice ?? null);
    } catch {
      setRenders([]);
      setProjects([]);
      setNotice("The studio shelf is unavailable right now.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loading = renders === null || projects === null;
  const latest = renders?.[0] ?? null;

  return (
    <div className="viz-scope w-full">
      <div className="mx-auto mt-20 min-h-[60vh] max-w-[1728px] px-4 pb-20 sm:mt-28 sm:px-6 md:mt-32 md:px-8 lg:mt-36 lg:px-12">
        {/* Masthead folio: meta line over an ink rule; title and deck below */}
        <header>
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-2">
              <p className="viz-label">DSource Studio</p>
              <Link
                href="/ai-visualizer"
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
                  The studio
                </h1>
                <p className="viz-serif max-w-md pb-1 text-base italic text-[var(--viz-muted)] sm:text-lg lg:text-right">
                  Every version kept — pick up the room mid-thought.
                </p>
              </div>
            </div>
          </Reveal>
        </header>

        <NoticesBox notices={notice ? [notice] : []} />

        {loading
          ? <p className="viz-mono mt-10 text-xs text-[var(--viz-muted)]">
              Opening the studio…
            </p>
          : <>
              {/* Continue where you left off — or the first-room invitation */}
              {latest
                ? <section className="mt-10">
                    <div className="flex items-baseline gap-4">
                      <h2 className="viz-serif text-2xl">
                        Continue where you left off
                      </h2>
                      <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                        REV of {shortDate(latest.createdAt)}
                      </p>
                    </div>
                    <Link
                      href={`/ai-visualizer?render=${latest.id}`}
                      className="group mt-4 block"
                    >
                      <article className="grid overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] transition-colors duration-200 group-hover:border-[var(--viz-ink)] md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                        <div className="aspect-[16/9] border-b border-[var(--viz-line)] bg-[var(--viz-ground)] md:aspect-auto md:max-h-[46vh] md:border-r md:border-b-0">
                          {/* Signed URLs are short-lived — next/image can't optimize them. */}
                          {/* biome-ignore lint/performance/noImgElement: signed URLs cannot use next/image */}
                          <img
                            src={latest.imageUrl}
                            alt={latest.prompt || "Your latest render"}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col justify-between gap-6 p-5 md:p-6">
                          <div>
                            <p className="viz-label">
                              {shortDate(latest.createdAt)}
                              {latest.model ? ` · ${latest.model}` : ""}
                            </p>
                            {latest.prompt && (
                              <p className="viz-serif mt-3 line-clamp-4 text-lg italic text-[var(--viz-ink)]">
                                &ldquo;{latest.prompt}&rdquo;
                              </p>
                            )}
                          </div>
                          <p className={QUIET_ACTION}>Resume in the studio →</p>
                        </div>
                      </article>
                    </Link>
                  </section>
                : <section className="mt-10">
                    <div className="max-w-2xl">
                      <p className="viz-serif text-2xl italic sm:text-3xl">
                        Every room starts as a sketch. Bring yours.
                      </p>
                      <p className="mt-3 text-sm text-[var(--viz-muted)]">
                        Upload a photo of the room you have; every render is
                        kept here, and your original photo is never touched.
                      </p>
                      <Link
                        href="/ai-visualizer"
                        className="viz-btn mt-6 inline-block rounded-full bg-[var(--viz-ink)] px-6 py-3 text-[var(--viz-paper)] transition-colors hover:bg-black"
                      >
                        Bring your first room
                      </Link>
                    </div>
                  </section>}

              {/* Folios — the whole cabinet lives here (no separate page) */}
              <section className="mt-14">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <h2 className="viz-serif text-2xl">Folios</h2>
                  <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                    {String(projects.length).padStart(2, "0")}{" "}
                    {projects.length === 1 ? "folio" : "folios"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewFolioOpen((v) => !v)}
                    className={`${QUIET_ACTION} cursor-pointer`}
                  >
                    {newFolioOpen ? "Close" : "+ New folio"}
                  </button>
                </div>
                {newFolioOpen && (
                  <div className="mt-4 max-w-xl">
                    <NewFolioForm
                      onCreated={() => {
                        setNewFolioOpen(false);
                        load();
                      }}
                      onCancel={() => setNewFolioOpen(false)}
                    />
                  </div>
                )}
                {projects.length === 0 && !newFolioOpen
                  ? <p className="viz-mono mt-4 text-xs text-[var(--viz-muted)]">
                      No folios yet — start one for the home you&rsquo;re
                      designing, then file renders into it from the visualizer.
                    </p>
                  : <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {projects.map((project) => (
                        <FolioCard key={project.id} project={project} />
                      ))}
                    </div>}
              </section>

              {/* The tools — three quiet ruled rows, type doing the work */}
              <section className="mt-14">
                <h2 className="viz-serif text-2xl">The tools</h2>
                <ul className="mt-4">
                  {TOOLS.map((tool, i) => (
                    <li
                      key={tool.href}
                      className="border-b border-[var(--viz-line)]"
                    >
                      <Link
                        href={tool.href}
                        className="group flex items-baseline gap-4 py-4 sm:gap-6"
                      >
                        <span className="viz-label w-7 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="viz-mono w-32 shrink-0 text-xs tracking-[0.08em] uppercase transition-colors group-hover:text-[var(--viz-ink)] sm:w-40">
                          {tool.name}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--viz-muted)]">
                          {tool.line}
                        </span>
                        <span
                          className="viz-mono shrink-0 text-xs text-[var(--viz-muted)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--viz-ink)]"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Recent work */}
              {renders.length > 0 && (
                <section className="mt-14">
                  <div className="flex items-baseline gap-4">
                    <h2 className="viz-serif text-2xl">Recent work</h2>
                    <p className="viz-mono text-[11px] text-[var(--viz-muted)]">
                      {String(renders.length).padStart(2, "0")}{" "}
                      {renders.length === 1 ? "render" : "renders"} on the shelf
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {renders.map((render) => (
                      <Link
                        key={render.id}
                        href={`/ai-visualizer?render=${render.id}`}
                        className="group block"
                      >
                        <article className="overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)] transition-colors duration-200 group-hover:border-[var(--viz-ink)]">
                          <div className="aspect-[4/3] border-b border-[var(--viz-line)] bg-[var(--viz-ground)]">
                            {/* biome-ignore lint/performance/noImgElement: signed URLs cannot use next/image */}
                            <img
                              src={render.imageUrl}
                              alt={render.prompt || "Render"}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p
                            className="viz-mono truncate p-2.5 text-[11px] text-[var(--viz-muted)]"
                            title={render.prompt || undefined}
                          >
                            {shortDate(render.createdAt)}
                            {render.prompt ? ` · ${render.prompt}` : ""}
                          </p>
                        </article>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>}
      </div>
    </div>
  );
}
