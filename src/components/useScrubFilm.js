"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

/**
 * Shared scroll-scrubbed film engine. Preloads a WebP frame sequence, paints
 * each frame cover-fitted onto a canvas, and cross-fades the two frames that
 * bracket the scroll position so the film reads as continuous motion however
 * slowly you scroll. A pinned ScrollTrigger maps scroll progress → frame
 * index; the drawn index lerps toward that target (ease 0.1) so the picture
 * coasts to rest rather than snapping.
 *
 * `variants` runs a full-res / long-pin set on desktop and a lighter /
 * shorter-pin set on phones — same scroll film, only resolution and length
 * differ. `onProgress(p, self)` fires each update for overlays (titles,
 * chapters, callouts, nav fade); drive those imperatively with gsap.set or
 * with cheap boundary-change React state, never a per-tick re-render.
 *
 * Reduced-motion is the caller's job: pass only no-preference media queries in
 * `variants` and render a static fallback, exactly like the hero.
 *
 * Used by the homepage hero (VideoScrollHero) and the Features narrated story
 * (NarratedStory) so the scroll film behaves identically in both places.
 *
 * @param {object}   o
 * @param {object}   o.rootRef     ref to the pinned section (the ScrollTrigger trigger)
 * @param {object}   o.canvasRef   ref to the <canvas> the film paints to
 * @param {number}   o.frameCount  number of frames in the sequence
 * @param {Array<{query:string, srcOf:(i:number)=>string, pinVh:number}>} o.variants
 * @param {number}  [o.tailHold]   fraction of scroll at the end where the film
 *                                 holds on its last frame (default 0.08)
 * @param {(p:number, self:object)=>void} [o.onProgress]
 * @param {(self:object)=>void}          [o.onLeave]
 * @param {object}  [o.stRef]      ref filled with the live ScrollTrigger so a
 *                                 caller can scrollTo a point in the film
 */
export function useScrubFilm({
  rootRef,
  canvasRef,
  frameCount,
  variants,
  tailHold = 0.08,
  onProgress,
  onLeave,
  stRef,
}) {
  // Set up once on mount, like the hero: refs and primitive config are stable
  // for the component's life, and overlays read live values off refs each tick.
  // biome-ignore lint/correctness/useExhaustiveDependencies: film is created once; re-running would tear down and rebuild the pin
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    const runFilm = ({ srcOf, pinVh }) => {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

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
      let toLoad = frameCount;

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

      // Cross-fade the two frames bracketing a fractional index so playback
      // stays continuous, no flipbook step, however slow the scroll.
      const draw = (fidx) => {
        const lo = Math.floor(fidx);
        const hi = Math.min(lo + 1, frameCount - 1);
        const t = fidx - lo;
        context.clearRect(0, 0, stageSize.w, stageSize.h);
        drawCover(images[lo], 1);
        if (t > 0.001 && hi !== lo) drawCover(images[hi], t);
      };

      const onImageSettled = () => {
        toLoad -= 1;
        if (toLoad === 0) draw(0);
      };
      for (let i = 0; i < frameCount; i++) {
        const img = new window.Image();
        img.onload = onImageSettled;
        img.onerror = onImageSettled;
        img.src = srcOf(i);
        images.push(img);
      }

      // Ease the drawn position toward the scroll target and redraw when it
      // has moved a hair, so the film keeps gliding a beat after scroll settles.
      const tick = () => {
        frame.current += (frame.target - frame.current) * 0.1;
        if (Math.abs(frame.current - frame.drawn) > 0.0015) {
          frame.drawn = frame.current;
          draw(frame.current);
        }
      };
      gsap.ticker.add(tick);

      const st = ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top top",
        end: `+=${window.innerHeight * pinVh}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          frame.target = Math.min(p / (1 - tailHold), 1) * (frameCount - 1);
          onProgress?.(p, self);
        },
        onLeave: (self) => onLeave?.(self),
      });
      if (stRef) stRef.current = st;

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
        if (stRef) stRef.current = null;
      };
    };

    for (const v of variants) {
      mm.add(v.query, () => runFilm(v));
    }
    return () => mm.revert();
  }, []);
}
