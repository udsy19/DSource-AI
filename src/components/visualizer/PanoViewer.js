"use client";

import { useEffect, useRef, useState } from "react";

const MAX_LAT = 75; // degrees; keep the view off the poles
const IDLE_AFTER_MS = 2500;
const DRAG_DEG_PER_PX = 0.18;
const DRIFT_DEG_PER_SEC = 1.5;
const LERP = 0.08;

/**
 * Immersive 360° viewer: maps an equirectangular panorama onto the inside
 * of a sphere with the camera at its center, so the room can be looked
 * around by dragging. three.js is imported dynamically inside the effect
 * so it never enters the SSR bundle.
 */
export default function PanoViewer({ pano, onClose }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!pano || !container) return undefined;

    let disposed = false;
    let rafId = 0;
    let cleanupScene = null;

    (async () => {
      let THREE;
      let renderer;
      try {
        THREE = await import("three");
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        if (!disposed) setError("360° view isn't available on this device.");
        return;
      }
      if (disposed) {
        renderer.dispose();
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / Math.max(container.clientHeight, 1),
        0.1,
        100,
      );
      camera.position.set(0, 0, 0);

      const loader = new THREE.TextureLoader();
      let panoTexture;
      try {
        panoTexture = await loader.loadAsync(pano);
      } catch {
        if (!disposed) setError("Couldn't load the panorama image.");
        renderer.domElement.remove();
        renderer.dispose();
        return;
      }
      if (disposed) {
        panoTexture.dispose();
        renderer.domElement.remove();
        renderer.dispose();
        return;
      }

      panoTexture.colorSpace = THREE.SRGBColorSpace;
      panoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // Sphere flipped inside-out so the texture faces the camera at its
      // center; the material needs no lights.
      const geometry = new THREE.SphereGeometry(50, 64, 48);
      geometry.scale(-1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ map: panoTexture });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const resizeObserver = new ResizeObserver(() => {
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect =
          container.clientWidth / Math.max(container.clientHeight, 1);
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(container);

      // Pointer-drag → target lon/lat; the RAF loop eases toward it and
      // drifts slowly around the room once the pointer has been idle.
      let lon = 0;
      let lat = 0;
      let targetLon = 0;
      let targetLat = 0;
      let dragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartLon = 0;
      let dragStartLat = 0;
      let lastMoveAt = 0;

      const clampLat = (value) => Math.min(Math.max(value, -MAX_LAT), MAX_LAT);

      const onPointerDown = (event) => {
        dragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragStartLon = targetLon;
        dragStartLat = targetLat;
        lastMoveAt = performance.now();
        container.setPointerCapture?.(event.pointerId);
      };
      const onPointerMove = (event) => {
        if (!dragging) return;
        targetLon =
          dragStartLon + (dragStartX - event.clientX) * DRAG_DEG_PER_PX;
        targetLat = clampLat(
          dragStartLat + (event.clientY - dragStartY) * DRAG_DEG_PER_PX,
        );
        lastMoveAt = performance.now();
      };
      const onPointerUp = () => {
        dragging = false;
        lastMoveAt = performance.now();
      };
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerup", onPointerUp);
      container.addEventListener("pointercancel", onPointerUp);

      const clock = new THREE.Clock();
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const idle =
          !dragging && performance.now() - lastMoveAt > IDLE_AFTER_MS;
        if (idle) {
          targetLon += DRIFT_DEG_PER_SEC * delta;
          targetLat += (0 - targetLat) * LERP * 0.25;
        }
        lon += (targetLon - lon) * LERP;
        lat += (targetLat - lat) * LERP;

        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon);
        camera.lookAt(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        );
        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      cleanupScene = () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerup", onPointerUp);
        container.removeEventListener("pointercancel", onPointerUp);
        geometry.dispose();
        material.dispose();
        panoTexture.dispose();
        renderer.domElement.remove();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanupScene?.();
    };
  }, [pano]);

  if (!pano) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#262521]/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="viz-serif text-xl">360° View</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="viz-label mt-1">DRAG TO LOOK AROUND · EXPERIMENTAL</p>

        <div
          ref={containerRef}
          className="relative mt-4 aspect-[16/10] w-full cursor-move touch-none overflow-hidden rounded-xl border border-[var(--viz-line)] bg-[#262521]"
        >
          {error
            ? <div className="absolute inset-0 flex items-center justify-center p-6">
                <p className="viz-mono text-center text-xs text-white/80">
                  {error}
                </p>
              </div>
            : !ready && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="viz-mono text-xs text-white/60">
                    PREPARING 360° SCENE…
                  </p>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
