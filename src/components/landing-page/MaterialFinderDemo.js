"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import featureRoom from "../../../public/feature-room.webp";
import tableThumb from "../../../public/material-finder-images/Coffee Table.png";
import lampThumb from "../../../public/material-finder-images/Curtain.png";
import rugThumb from "../../../public/material-finder-images/Frame 90.png";
import artThumb from "../../../public/material-finder-images/Frame 118.png";
import sofaThumb from "../../../public/material-finder-images/Sofa 1.png";

// Each detected piece: a hotspot center, a bounding box (both in % of the
// image), and the product it resolves to. Ordered top→down so the initial
// "scan" reveals them the way the eye travels the room.
const ITEMS = [
  {
    id: "art",
    label: "Framed print",
    thumb: artThumb,
    name: "Arc Diptych",
    brand: "Bree",
    meta: "Giclée · pair",
    price: "₹9,800",
    dot: { top: "24%", left: "80%" },
    box: { top: "12%", left: "73%", w: "23%", h: "34%" },
    card: { top: "30%", left: "58%" },
  },
  {
    id: "lamp",
    label: "Floor lamp",
    thumb: lampThumb,
    name: "Arvo Floor Lamp",
    brand: "Brere",
    meta: "Brass · dimmable",
    price: "₹28,900",
    dot: { top: "38%", left: "47%" },
    box: { top: "28%", left: "42%", w: "11%", h: "34%" },
    card: { top: "44%", left: "20%" },
  },
  {
    id: "sofa",
    label: "Bouclé sofa",
    thumb: sofaThumb,
    name: "Bouclé Sofa",
    brand: "Brere",
    meta: "Ivory · 3-seat",
    price: "₹1,84,000",
    dot: { top: "58%", left: "74%" },
    box: { top: "46%", left: "58%", w: "40%", h: "34%" },
    card: { top: "52%", left: "44%" },
  },
  {
    id: "table",
    label: "Coffee table",
    thumb: tableThumb,
    name: "Oak Coffee Table",
    brand: "Bree",
    meta: "Warm oak · 120cm",
    price: "₹42,500",
    dot: { top: "74%", left: "45%" },
    box: { top: "64%", left: "32%", w: "34%", h: "23%" },
    card: { top: "56%", left: "24%" },
  },
  {
    id: "rug",
    label: "Jute rug",
    thumb: rugThumb,
    name: "Handwoven Jute Rug",
    brand: "Bree",
    meta: "Natural · 8×10",
    price: "₹36,000",
    dot: { top: "88%", left: "37%" },
    box: { top: "76%", left: "22%", w: "56%", h: "21%" },
    card: { top: "64%", left: "40%" },
  },
];

/**
 * Interactive detection playground: on load the room "scans" and detects
 * each piece in sequence, then auto-cycles through them. Hovering or
 * clicking any hotspot (or any product row) draws that item's bounding box,
 * blooms its card, and highlights the matching row — so the detect→source
 * story is one connected, hands-on scene. Reduced-motion shows it static
 * but still interactive.
 */
export default function MaterialFinderDemo() {
  const [detected, setDetected] = useState(0); // how many have "scanned in"
  const [active, setActive] = useState(0);
  const [scanning, setScanning] = useState(true);
  const holdRef = useRef(false); // user is driving — pause auto-cycle
  const stageRef = useRef(null);

  // Initial scan: reveal hotspots one by one, then hand off to auto-cycle.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDetected(ITEMS.length);
      setScanning(false);
      return undefined;
    }
    const timers = [];
    ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setDetected(i + 1), 500 + i * 260));
    });
    timers.push(setTimeout(() => setScanning(false), 500 + ITEMS.length * 260));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-cycle through items once detection finishes, unless the user is
  // hovering/driving the scene.
  useEffect(() => {
    if (scanning) return undefined;
    const id = setInterval(() => {
      if (!holdRef.current) setActive((a) => (a + 1) % ITEMS.length);
    }, 2400);
    return () => clearInterval(id);
  }, [scanning]);

  const pick = (i) => {
    holdRef.current = true;
    setActive(i);
  };
  const release = () => {
    holdRef.current = false;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      {/* The room stage */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouseleave only resumes autoplay; all controls inside are real buttons */}
      <div ref={stageRef} className="lg:col-span-7" onMouseLeave={release}>
        <div className="relative overflow-hidden rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-2">
          <div className="relative overflow-hidden rounded-xl">
            <Image
              src={featureRoom}
              alt="A warm living room with each piece detected and matched to a product"
              priority
              className="h-auto w-full"
            />

            {/* Scan sweep on load */}
            {scanning && (
              <span
                className="mf-scan pointer-events-none absolute inset-y-0 left-0 w-1/3"
                aria-hidden="true"
              />
            )}

            {/* Active bounding box */}
            {ITEMS.map((item, i) => (
              <span
                key={`box-${item.id}`}
                className="pointer-events-none absolute rounded-md border-2 border-[var(--viz-blue)] bg-[var(--viz-blue)]/10 transition-all duration-500"
                style={{
                  top: item.box.top,
                  left: item.box.left,
                  width: item.box.w,
                  height: item.box.h,
                  opacity: !scanning && active === i ? 1 : 0,
                  transform:
                    !scanning && active === i ? "scale(1)" : "scale(0.96)",
                }}
                aria-hidden="true"
              />
            ))}

            {/* Hotspot dots — detected in sequence, then clickable */}
            {ITEMS.map((item, i) => (
              <button
                key={`dot-${item.id}`}
                type="button"
                onMouseEnter={() => pick(i)}
                onFocus={() => pick(i)}
                onClick={() => pick(i)}
                aria-label={`Show ${item.name}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
                style={{
                  top: item.dot.top,
                  left: item.dot.left,
                  opacity: i < detected ? 1 : 0,
                  transform: `translate(-50%, -50%) scale(${
                    i < detected ? 1 : 0.4
                  })`,
                }}
              >
                <span className="relative flex items-center justify-center">
                  {active === i && !scanning && (
                    <span className="absolute h-6 w-6 animate-ping rounded-full border-2 border-white/60" />
                  )}
                  <span
                    className={`block rounded-full border-2 shadow-lg transition-all duration-300 ${
                      active === i
                        ? "h-4 w-4 border-white bg-[var(--viz-blue)]"
                        : "h-3.5 w-3.5 border-white/80 bg-white/90"
                    }`}
                  />
                </span>
              </button>
            ))}

            {/* Active product card */}
            {ITEMS.map((item, i) => (
              <div
                key={`card-${item.id}`}
                className="pointer-events-none absolute w-48 -translate-y-1/2 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-paper)]/95 p-2.5 shadow-xl backdrop-blur-sm transition-all duration-400"
                style={{
                  top: item.card.top,
                  left: item.card.left,
                  opacity: !scanning && active === i ? 1 : 0,
                  transform: `translateY(-50%) scale(${
                    !scanning && active === i ? 1 : 0.9
                  })`,
                }}
                aria-hidden={active !== i}
              >
                <p className="viz-label">Found in this room</p>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <Image
                    src={item.thumb}
                    alt=""
                    width={48}
                    height={40}
                    className="h-10 w-12 rounded-lg border border-[var(--viz-line)] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.name}
                    </p>
                    <p className="text-xs text-[var(--viz-muted)]">
                      {item.brand}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live status line */}
        <p className="viz-mono mt-3 text-[11px] tracking-[0.08em] text-[var(--viz-muted)] uppercase">
          {scanning
            ? `Scanning the room… ${detected}/${ITEMS.length} pieces found`
            : "Hover a dot, or a product below — the room follows"}
        </p>
      </div>

      {/* The match panel — rows synced to the active hotspot */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse-leave only resets a decorative hover sync; the rows inside are real buttons */}
      <div className="lg:col-span-5" onMouseLeave={release}>
        <div className="viz-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--viz-line)] px-5 py-3">
            <p className="viz-label">AI material match</p>
            <p className="viz-mono text-[11px] text-[var(--viz-blue)]">
              {ITEMS.length} matches
            </p>
          </div>
          <ul>
            {ITEMS.map((item, i) => {
              const on = active === i && !scanning;
              return (
                <li
                  key={item.id}
                  className="border-t border-[var(--viz-line)] first:border-t-0"
                >
                  <button
                    type="button"
                    onMouseEnter={() => pick(i)}
                    onFocus={() => pick(i)}
                    onClick={() => pick(i)}
                    className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-300 ${
                      on
                        ? "bg-[var(--viz-blue)]/6"
                        : "hover:bg-[var(--viz-ground)]"
                    }`}
                  >
                    <span
                      className={`h-10 w-1 shrink-0 rounded-full transition-colors duration-300 ${
                        on ? "bg-[var(--viz-blue)]" : "bg-transparent"
                      }`}
                      aria-hidden="true"
                    />
                    <Image
                      src={item.thumb}
                      alt=""
                      width={56}
                      height={48}
                      className="h-11 w-14 shrink-0 rounded-lg border border-[var(--viz-line)] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="viz-serif truncate text-base">
                          {item.name}
                        </span>
                        <span className="viz-mono shrink-0 text-xs">
                          {item.price}
                        </span>
                      </span>
                      <span className="viz-mono mt-0.5 block truncate text-[10px] tracking-[0.06em] text-[var(--viz-muted)] uppercase">
                        {item.brand} · {item.meta}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full border border-[var(--viz-ink)] px-4 py-1.5 text-xs font-medium">
            View product
          </span>
          <span className="rounded-full bg-[var(--viz-blue)] px-4 py-1.5 text-xs font-medium text-white">
            Add to spec
          </span>
        </div>
      </div>
    </div>
  );
}
