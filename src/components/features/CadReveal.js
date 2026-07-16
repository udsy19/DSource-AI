"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import featureRoom from "../../../public/feature-room.webp";

// Line-work traced over the room photo (loose perspective) — the "2D view".
const PLAN_PATHS = [
  // floor + wall datum
  "M0 690 H1376",
  "M120 60 V660 M1300 60 V640",
  "M120 60 H1300",
  // window / curtains, left
  "M60 90 H400 V660 H60 Z",
  "M150 90 V660 M250 90 V660 M330 90 V660",
  // floor lamp
  "M470 640 V320 M446 320 H512 L500 300 H458 Z",
  // framed prints, upper right
  "M1030 60 h120 v150 h-120 Z M1180 60 h110 v150 h-110 Z",
  // sofa
  "M640 660 V470 Q640 440 672 440 H1140 Q1180 440 1180 470 V660",
  "M672 540 H1160",
  "M700 440 V400 Q700 372 732 372 H980 Q1012 372 1012 400 V440",
  // coffee table
  "M470 660 V566 M740 660 V566 M440 566 H770",
  "M600 566 V536 Q636 520 672 536 V566",
  // leather chair, right edge
  "M1230 660 V486 Q1230 462 1256 462 H1360 V660",
  // rug outline
  "M300 690 Q640 636 1000 690",
];

// A flat orthographic elevation of the same living wall.
const ELEV_PATHS = [
  "M60 620 H1316",
  "M60 120 V620 M1316 120 V620 M60 120 H1316",
  // window
  "M980 170 h240 v300 h-240 Z M1100 170 V470 M980 320 H1220",
  // framed art
  "M180 200 h150 v120 h-150 Z",
  // sofa elevation
  "M240 620 V470 Q240 440 272 440 H700 Q732 440 732 470 V620",
  "M272 520 H700",
  "M290 440 V400 Q290 372 322 372 H648 Q680 372 680 400 V440",
  // side table + lamp
  "M780 620 V540 M900 620 V540 M760 540 H920",
  "M840 540 V380 M812 380 H868 L855 360 H825 Z",
  // dimension line
  "M240 660 H732 M240 652 V668 M732 652 V668",
];

const STAGES = [
  { key: "photo", label: "Room photo" },
  { key: "trace", label: "2D view · plan" },
  { key: "elev", label: "Elevation A · living wall" },
];

/**
 * Animated Image-to-CAD demo. A room photo is scanned; line-work traces onto
 * it; the photo fades to leave a clean 2D drawing; then it morphs into a wall
 * elevation — looping. Reduced-motion shows the finished 2D drawing, static.
 */
export default function CadReveal() {
  const [stage, setStage] = useState(0);
  const photoRef = useRef(null);
  const planRef = useRef(null);
  const elevRef = useRef(null);
  const scanRef = useRef(null);

  useEffect(() => {
    const planPaths = planRef.current.querySelectorAll("path");
    const elevPaths = elevRef.current.querySelectorAll("path");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(photoRef.current, { autoAlpha: 0.14 });
      gsap.set(planPaths, { strokeDashoffset: 0 });
      gsap.set(elevRef.current, { autoAlpha: 0 });
      setStage(1);
      return undefined;
    }

    gsap.set(planPaths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(elevPaths, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(elevRef.current, { autoAlpha: 0 });
    gsap.set(scanRef.current, { xPercent: -140, autoAlpha: 0 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
    tl
      // 1 — the photo, then the scan sweep traces the plan
      .set(photoRef.current, { autoAlpha: 1 })
      .call(() => setStage(0))
      .to(scanRef.current, { autoAlpha: 1, duration: 0.2 }, 0.6)
      .to(
        scanRef.current,
        { xPercent: 260, duration: 1.5, ease: "power1.inOut" },
        0.6,
      )
      .to(scanRef.current, { autoAlpha: 0, duration: 0.3 }, 2.0)
      .to(
        planPaths,
        {
          strokeDashoffset: 0,
          duration: 1.4,
          stagger: 0.05,
          ease: "power1.out",
        },
        0.7,
      )
      // 2 — photo fades away, leaving the clean drawing
      .call(() => setStage(1), null, 2.3)
      .to(photoRef.current, { autoAlpha: 0.1, duration: 0.7 }, 2.3)
      .to({}, { duration: 1.3 })
      // 3 — cross-fade the plan into the elevation
      .call(() => setStage(2))
      .to(planRef.current, { autoAlpha: 0, duration: 0.5 }, "<")
      .to(elevRef.current, { autoAlpha: 1, duration: 0.3 }, "<")
      .to(
        elevPaths,
        {
          strokeDashoffset: 0,
          duration: 1.3,
          stagger: 0.04,
          ease: "power1.out",
        },
        "<",
      )
      .to({}, { duration: 1.6 })
      // reset back to the photo
      .to([elevRef.current], { autoAlpha: 0, duration: 0.5 })
      .set(elevPaths, { strokeDashoffset: 1 })
      .set(planRef.current, { autoAlpha: 1 })
      .set(planPaths, { strokeDashoffset: 1 });

    return () => tl.kill();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)]">
      {/* The photo being traced */}
      <div ref={photoRef} className="relative">
        <Image
          src={featureRoom}
          alt="A room photo being converted to a CAD drawing"
          className="h-auto w-full"
        />
        <span
          className="absolute inset-0 bg-[var(--viz-paper)]/10"
          aria-hidden="true"
        />
      </div>

      {/* Scan bar */}
      <span
        ref={scanRef}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
        style={{
          background:
            "linear-gradient(100deg, transparent, rgba(53,65,140,0.28), rgba(53,65,140,0.5), rgba(53,65,140,0.28), transparent)",
        }}
        aria-hidden="true"
      />

      {/* Plan trace, drawn over the photo */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1376 768"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g
          ref={planRef}
          stroke="#2a261e"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {PLAN_PATHS.map((d) => (
            <path key={d} pathLength="1" d={d} />
          ))}
        </g>
      </svg>

      {/* Elevation, on the paper */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1376 768"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g
          ref={elevRef}
          stroke="#57503f"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ELEV_PATHS.map((d) => (
            <path key={d} pathLength="1" d={d} />
          ))}
        </g>
      </svg>

      {/* Caption + soon badge */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
        <p className="viz-mono rounded bg-[var(--viz-paper)]/85 px-2 py-1 text-[11px] tracking-[0.08em] text-[var(--viz-ink)] uppercase">
          {STAGES[stage].label}
        </p>
        <span className="viz-mono rounded-full border border-[var(--viz-blue)]/40 bg-[var(--viz-blue)]/6 px-2.5 py-0.5 text-[10px] tracking-widest text-[var(--viz-blue-deep)] uppercase">
          Elevations · soon
        </span>
      </div>
    </div>
  );
}
