"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

// 243 frames (4K webp) from three chained Higgsfield clips: a golden-hour
// orbit toward the villa, one continuous glide through the teak door into
// the empty house, and the room furnishing itself piece by piece.
// `hero-film.mp4` is the same three clips stitched for mobile. (design.md §12)
const FRAME_COUNT = 243;
const framePath = (i) => `/frames/frame_${String(i + 1).padStart(4, "0")}.webp`;

/**
 * Scroll-scrubbed film hero in three acts, pinned for ~6 screens. On load
 * the title sequence reveals over a soft scrim (staggered, cinematic); the
 * camera orbits the villa (title recedes at the threshold), glides through
 * the door into the empty house, and the room designs itself until the film
 * unpins into The Workflow. Desktop plays the frame sequence on a canvas
 * with a lerped frame index (smooth even as scroll eases to a stop); phones
 * autoplay the stitched film. The global nav bows out over the first 10%.
 * Site-wide smooth scroll comes from the shared Lenis in the layout.
 */
export default function VideoScrollHero() {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const copyRef = useRef(null);
  const scrimRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // --- Title sequence: staggered mask-reveal on load, every viewport ---
    if (!reduce) {
      const lines = rootRef.current.querySelectorAll(".hero-copy-line");
      gsap.set(lines, { yPercent: 118 });
      gsap.set(scrimRef.current, { autoAlpha: 0 });
      gsap
        .timeline({ delay: 0.3 })
        .to(
          scrimRef.current,
          { autoAlpha: 1, duration: 1.1, ease: "power2.out" },
          0,
        )
        .to(
          lines,
          { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.13 },
          0.1,
        );
    }

    // --- Desktop: canvas frame theatre with lerped playback ---
    mm.add(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
      () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const nav = document.querySelector("div.viz-scope.fixed");

        const stageSize = { w: 0, h: 0 };
        const setCanvasSize = () => {
          const rect = rootRef.current.getBoundingClientRect();
          stageSize.w = rect.width;
          stageSize.h = rect.height;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);
          canvas.style.width = `${rect.width}px`;
          canvas.style.height = `${rect.height}px`;
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
        };
        setCanvasSize();

        const images = [];
        const frame = { current: 0, target: 0, drawn: -1 };
        let toLoad = FRAME_COUNT;

        // One image cover-fitted onto the stage, at a given opacity.
        const drawCover = (img, alpha) => {
          if (!img || !img.complete || img.naturalWidth === 0) return;
          const w = stageSize.w;
          const h = stageSize.h;
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
          context.globalAlpha = alpha;
          context.drawImage(img, dx, dy, dw, dh);
          context.globalAlpha = 1;
        };

        // Cross-fade the two frames bracketing a fractional index. This makes
        // 243 discrete frames read as continuous motion — no flipbook step,
        // no matter how slowly you scroll.
        const draw = (fidx) => {
          const lo = Math.floor(fidx);
          const hi = Math.min(lo + 1, FRAME_COUNT - 1);
          const t = fidx - lo;
          context.clearRect(0, 0, stageSize.w, stageSize.h);
          drawCover(images[lo], 1);
          if (t > 0.001 && hi !== lo) drawCover(images[hi], t);
        };

        const onImageSettled = () => {
          toLoad -= 1;
          if (toLoad === 0) draw(0);
        };
        for (let i = 0; i < FRAME_COUNT; i++) {
          const img = new window.Image();
          img.onload = onImageSettled;
          img.onerror = onImageSettled;
          img.src = framePath(i);
          images.push(img);
        }

        // Ease the drawn position toward the scroll target every frame and
        // redraw whenever it has moved a hair — the ease plus the cross-fade
        // together give buttery playback even as scroll decelerates.
        const tick = () => {
          frame.current += (frame.target - frame.current) * 0.16;
          if (Math.abs(frame.current - frame.drawn) > 0.002) {
            frame.drawn = frame.current;
            draw(frame.current);
          }
        };
        gsap.ticker.add(tick);

        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: "top top",
          end: `+=${window.innerHeight * 6}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;
            frame.target = Math.min(p / 0.92, 1) * (FRAME_COUNT - 1);

            if (nav) {
              gsap.set(nav, {
                opacity: p < 0.1 ? 1 - p / 0.1 : 0,
                pointerEvents: p < 0.05 ? "auto" : "none",
              });
            }

            // Title + scrim lift away together across the first act.
            const out = Math.min(p / 0.16, 1);
            gsap.set(copyRef.current, {
              autoAlpha: 1 - out,
              yPercent: -10 * out,
            });
            gsap.set(scrimRef.current, { autoAlpha: 1 - out });
          },
          onLeave: () =>
            nav &&
            gsap.to(nav, { opacity: 1, pointerEvents: "auto", duration: 0.4 }),
        });

        const onResize = () => {
          setCanvasSize();
          draw(frame.current);
          ScrollTrigger.refresh();
        };
        window.addEventListener("resize", onResize);

        return () => {
          window.removeEventListener("resize", onResize);
          gsap.ticker.remove(tick);
          st.kill();
          if (nav) gsap.set(nav, { opacity: 1, pointerEvents: "auto" });
        };
      },
    );

    // --- Mobile: title lifts away as you scroll past the film ---
    mm.add("(max-width: 1023px)", () => {
      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          const out = Math.min(self.progress / 0.5, 1);
          gsap.set(copyRef.current, {
            autoAlpha: 1 - out,
            yPercent: -10 * out,
          });
          gsap.set(scrimRef.current, { autoAlpha: 1 - out });
        },
      });
      return () => st.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="viz-scope relative h-svh w-full overflow-hidden bg-[var(--viz-well)]"
    >
      {/* The film — canvas on desktop, autoplay video on mobile. Both are
          decorative background media: hidden from AT and out of tab order. */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 hidden lg:block"
        aria-hidden="true"
        tabIndex={-1}
      />
      <video
        className="absolute inset-0 h-full w-full object-cover lg:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={framePath(0)}
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/hero-film.mp4" type="video/mp4" />
      </video>

      {/* Legibility scrim: a soft dark wash behind the title, fading with it. */}
      <div
        ref={scrimRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 90% at 50% 40%, rgba(26,22,16,0.64) 0%, rgba(26,22,16,0.34) 44%, transparent 74%)",
        }}
        aria-hidden="true"
      />

      {/* Title sequence. Each clip container carries bottom padding pulled
          back by negative margin, so mask-reveal never crops descenders. */}
      <div
        ref={copyRef}
        className="absolute inset-x-0 top-[25%] flex flex-col items-center px-6 text-center"
      >
        <div className="-mb-[0.2em] overflow-hidden pb-[0.2em]">
          <p className="hero-copy-line viz-mono text-[11px] tracking-[0.32em] text-white/80 uppercase sm:text-xs">
            Your materials guide
          </p>
        </div>
        <h1 className="viz-serif mt-4 max-w-3xl text-4xl leading-[1.12] text-white sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="block -mb-[0.16em] overflow-hidden pb-[0.16em]">
            <span className="hero-copy-line block">Materials matched.</span>
          </span>
          <span className="block -mb-[0.16em] overflow-hidden pb-[0.16em]">
            <span className="hero-copy-line block">Projects simplified.</span>
          </span>
          <span className="block -mb-[0.16em] overflow-hidden pb-[0.16em]">
            <span className="hero-copy-line block italic">
              Designs elevated.
            </span>
          </span>
        </h1>
        <div className="mt-8 -mb-[0.2em] overflow-hidden pb-[0.2em]">
          <p className="hero-copy-line viz-mono text-[10px] tracking-[0.3em] text-white/75 uppercase sm:text-[11px]">
            Upload · Match · Render · Spec
          </p>
        </div>
      </div>

      {/* Scroll cue */}
      <p className="viz-mono absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.3em] text-white/60 uppercase lg:bottom-8">
        Scroll
      </p>
    </section>
  );
}
