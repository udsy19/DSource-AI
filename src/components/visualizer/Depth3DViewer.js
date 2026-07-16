"use client";

import { useEffect, useRef, useState } from "react";

const MAX_YAW = (8 * Math.PI) / 180; // ±8° left/right
const MAX_PITCH = (5 * Math.PI) / 180; // ±5° up/down
const IDLE_AFTER_MS = 2500;
const LERP = 0.06;

/**
 * Depth-parallax "2.5D" viewer: displaces a subdivided plane with the
 * grayscale depth map and eases it toward the pointer so the room image
 * can be "peeked around" like a living photo. three.js is imported
 * dynamically inside the effect so it never enters the SSR bundle.
 */
export default function Depth3DViewer({ image, depth, onClose }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!image || !depth || !container) return undefined;

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
        if (!disposed) setError("3D view isn't available on this device.");
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
        45,
        container.clientWidth / Math.max(container.clientHeight, 1),
        0.1,
        50,
      );

      const loader = new THREE.TextureLoader();
      let mapTexture;
      let depthTexture;
      try {
        [mapTexture, depthTexture] = await Promise.all([
          loader.loadAsync(image),
          loader.loadAsync(depth),
        ]);
      } catch {
        if (!disposed) setError("Couldn't load the room or depth image.");
        renderer.domElement.remove();
        renderer.dispose();
        return;
      }
      if (disposed) {
        mapTexture.dispose();
        depthTexture.dispose();
        renderer.domElement.remove();
        renderer.dispose();
        return;
      }

      mapTexture.colorSpace = THREE.SRGBColorSpace;
      mapTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // Plane sized to the image aspect ratio, densely subdivided so the
      // displacement map reads as smooth geometry rather than spikes.
      const imageAspect =
        mapTexture.image.width / Math.max(mapTexture.image.height, 1);
      const planeHeight = 2;
      const planeWidth = planeHeight * imageAspect;
      const geometry = new THREE.PlaneGeometry(
        planeWidth,
        planeHeight,
        256,
        256,
      );
      const displacementScale = planeHeight * 0.35;
      const material = new THREE.MeshStandardMaterial({
        map: mapTexture,
        displacementMap: depthTexture,
        displacementScale,
        // Center the relief around the plane so rotation pivots mid-depth.
        displacementBias: -displacementScale / 2,
        roughness: 1,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const ambient = new THREE.AmbientLight(0xffffff, 2.4);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(1, 1.5, 2);
      scene.add(ambient, directional);

      // Frame the plane "cover" style (slightly cropped) so its edges stay
      // hidden while the view tilts.
      const frameCamera = () => {
        const width = container.clientWidth;
        const height = Math.max(container.clientHeight, 1);
        camera.aspect = width / height;
        const halfFov = (camera.fov * Math.PI) / 360;
        const distForHeight = planeHeight / 2 / Math.tan(halfFov);
        const distForWidth = planeWidth / 2 / Math.tan(halfFov) / camera.aspect;
        camera.position.set(0, 0, Math.min(distForHeight, distForWidth) * 0.92);
        camera.updateProjectionMatrix();
      };
      frameCamera();

      const resizeObserver = new ResizeObserver(() => {
        renderer.setSize(container.clientWidth, container.clientHeight);
        frameCamera();
      });
      resizeObserver.observe(container);

      // Pointer → target rotation; the RAF loop lerps toward it each frame
      // and drifts into a gentle sway once the pointer has been idle.
      let targetYaw = 0;
      let targetPitch = 0;
      let lastMoveAt = 0;
      const onPointerMove = (event) => {
        const rect = container.getBoundingClientRect();
        const nx = Math.min(
          Math.max(((event.clientX - rect.left) / rect.width) * 2 - 1, -1),
          1,
        );
        const ny = Math.min(
          Math.max(((event.clientY - rect.top) / rect.height) * 2 - 1, -1),
          1,
        );
        targetYaw = nx * MAX_YAW;
        targetPitch = ny * MAX_PITCH;
        lastMoveAt = performance.now();
      };
      const onPointerLeave = () => {
        targetYaw = 0;
        targetPitch = 0;
        lastMoveAt = 0;
      };
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerdown", onPointerMove);
      container.addEventListener("pointerleave", onPointerLeave);
      container.addEventListener("pointercancel", onPointerLeave);

      const clock = new THREE.Clock();
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        const idle = performance.now() - lastMoveAt > IDLE_AFTER_MS;
        const yaw = idle ? Math.sin(elapsed * 0.5) * MAX_YAW * 0.25 : targetYaw;
        const pitch = idle
          ? Math.cos(elapsed * 0.35) * MAX_PITCH * 0.25
          : targetPitch;
        mesh.rotation.y += (yaw - mesh.rotation.y) * LERP;
        mesh.rotation.x += (pitch - mesh.rotation.x) * LERP;
        renderer.render(scene, camera);
      };
      animate();
      setReady(true);

      cleanupScene = () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerdown", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
        container.removeEventListener("pointercancel", onPointerLeave);
        geometry.dispose();
        material.dispose();
        mapTexture.dispose();
        depthTexture.dispose();
        renderer.domElement.remove();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanupScene?.();
    };
  }, [image, depth]);

  if (!image || !depth) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#262521]/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-paper)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="viz-serif text-xl">3D View</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="viz-label mt-1">MOVE TO LOOK AROUND · EXPERIMENTAL</p>

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
                    PREPARING 3D SCENE…
                  </p>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
