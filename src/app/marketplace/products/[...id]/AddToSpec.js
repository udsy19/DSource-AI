"use client";

import { useEffect, useRef, useState } from "react";
import { useSpec } from "@/contexts/SpecContext";

/**
 * Client island on the server-rendered product page: the one interactive
 * control, wired to the shared spec via useSpec().
 */
export default function AddToSpec({ product, category }) {
  const { addProductToSpec } = useSpec();
  const [added, setAdded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleAdd = () => {
    addProductToSpec(product, category);
    setAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      className="viz-btn flex-1 rounded-full bg-[var(--viz-ink)] px-6 py-3 text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)]"
    >
      {added ? "Added to spec ✓" : "Add to spec"}
    </button>
  );
}
