"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect, useRef } from "react";

// 243 frames from three chained Higgsfield clips: a golden-hour orbit
// toward the villa, the glide through the teak door into the empty house,
// and the room furnishing itself piece by piece (see design.md §12).
const FRAME_COUNT = 243;
const framePath = (i) => `/frames/frame_${String(i + 1).padStart(4, "0")}.jpg`;

/**
 * Scroll-scrubbed film hero in three acts, pinned for ~7 screens:
 * the camera orbits the villa at golden hour (the promise rides this act,
 * receding at the threshold), glides through the teak door into the empty
 * house, and then the room designs itself — furniture materializing piece
 * by piece until the film ends on the finished home and unpins into The
 * Workflow. The global nav bows out over the first 10% and returns on
 * unpin. Lenis smooth-scrolls the page while mounted (homepage only).
 *
 * Small screens and reduced-motion get the first frame and the promise,
 * statically.
 */
export default function VideoScrollHero() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const nav = document.querySelector("div.viz-scope.fixed");

        // Smooth scroll, wired into ScrollTrigger per the Lenis docs.
        const lenis = new Lenis();
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        const setCanvasSize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = window.innerWidth * dpr;
          canvas.height = window.innerHeight * dpr;
          canvas.style.width = `${window.innerWidth}px`;
          canvas.style.height = `${window.innerHeight}px`;
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        setCanvasSize();

        const images = [];
        const frame = { index: 0 };
        let toLoad = FRAME_COUNT;

        const render = () => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          context.clearRect(0, 0, w, h);
          const img = images[frame.index];
          if (!img || !img.complete || img.naturalWidth === 0) return;
          // cover-fit: fill the viewport, preserve aspect, center overflow
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const canvasRatio = w / h;
          let dw = w;
          let dh = h;
          let dx = 0;
          let dy = 0;
          if (imgRatio > canvasRatio) {
            dw = h * imgRatio;
            dx = (w - dw) / 2;
          } else {
            dh = w / imgRatio;
            dy = (h - dh) / 2;
          }
          context.drawImage(img, dx, dy, dw, dh);
        };

        const onImageSettled = () => {
          toLoad -= 1;
          if (toLoad === 0) render();
        };
        for (let i = 0; i < FRAME_COUNT; i++) {
          const img = new window.Image();
          img.onload = onImageSettled;
          img.onerror = onImageSettled;
          img.src = framePath(i);
          images.push(img);
        }

        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: "top top",
          end: `+=${window.innerHeight * 7}`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;

            // film: all frames land by 90% so the unpin never mid-frames
            const filmP = Math.min(p / 0.9, 1);
            const nextIndex = Math.round(filmP * (FRAME_COUNT - 1));
            if (nextIndex !== frame.index) {
              frame.index = nextIndex;
              render();
            }

            // global nav bows out across the first 10%
            if (nav) {
              gsap.set(nav, {
                opacity: p < 0.1 ? 1 - p / 0.1 : 0,
                pointerEvents: p < 0.05 ? "auto" : "none",
              });
            }

            // the promise rides the orbit, then recedes at the threshold
            const hp = Math.min(p / 0.28, 1);
            gsap.set(headerRef.current, {
              z: -900 * hp,
              opacity: p < 0.22 ? 1 : Math.max(0, 1 - (p - 0.22) / 0.06),
            });
          },
          onLeave: () =>
            nav &&
            gsap.to(nav, { opacity: 1, pointerEvents: "auto", duration: 0.4 }),
        });

        const onResize = () => {
          setCanvasSize();
          render();
          ScrollTrigger.refresh();
        };
        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          st.kill();
          gsap.ticker.remove(raf);
          lenis.destroy();
          if (nav) gsap.set(nav, { opacity: 1, pointerEvents: "auto" });
        };
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="viz-scope relative h-svh w-full overflow-hidden bg-[var(--viz-ground)]"
    >
      {/* The film */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 hidden lg:block"
        aria-hidden="true"
      />
      {/* Small screens: first frame, still */}
      <div
        className="absolute inset-0 bg-cover bg-center lg:hidden"
        style={{ backgroundImage: `url('${framePath(0)}')` }}
        aria-hidden="true"
      />

      {/* The promise, receding into the room */}
      <div
        className="absolute inset-0 flex items-start justify-center pt-[22vh]"
        style={{ perspective: "1000px" }}
      >
        <div ref={headerRef} className="px-6 text-center">
          <p className="viz-mono text-xs tracking-widest text-[var(--viz-ink)]/70 uppercase">
            Your materials guide
          </p>
          <h1 className="viz-serif mx-auto mt-5 max-w-3xl text-5xl leading-tight text-[var(--viz-ink)] [text-shadow:0_0_18px_rgba(251,249,244,0.95),0_0_60px_rgba(251,249,244,0.75)] md:text-6xl">
            Materials matched.
            <br />
            Projects simplified.
            <br />
            <span className="italic">Designs elevated.</span>
          </h1>
          <p className="viz-mono mt-8 text-[11px] tracking-[0.2em] text-[var(--viz-ink)]/60 uppercase">
            Upload · Match · Render · Spec
          </p>
        </div>
      </div>

      {/* Scroll cue */}
      <p className="viz-mono absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.2em] text-[var(--viz-ink)]/50 uppercase lg:bottom-8">
        Scroll
      </p>
    </section>
  );
}
