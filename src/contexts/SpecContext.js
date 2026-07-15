"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const SpecContext = createContext();

// localStorage key for the persisted spec (products + project name).
const STORAGE_KEY = "dsource-spec-v1";

export const useSpec = () => {
  const context = useContext(SpecContext);
  if (!context) {
    throw new Error("useSpec must be used within a SpecProvider");
  }
  return context;
};

export const SpecProvider = ({ children }) => {
  const [specProducts, setSpecProducts] = useState([]);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once from localStorage so the spec survives refreshes.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved?.products)) {
          setSpecProducts(saved.products);
        }
        if (typeof saved?.projectName === "string" && saved.projectName) {
          setProjectName(saved.projectName.slice(0, 80));
        }
      }
    } catch {
      // Corrupt storage — start fresh rather than crash.
    }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration, so the initial empty state doesn't
  // clobber a previously saved spec).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ products: specProducts, projectName }),
      );
    } catch {
      // Storage full/blocked — the in-memory spec still works.
    }
  }, [specProducts, projectName, hydrated]);

  const addProductToSpec = (product, category) => {
    // Generate a unique ID for the product in the spec
    const productId = `SP${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const specProduct = {
      id: productId,
      name: product.title || "Untitled Product",
      brand: product.brand || "Unknown Brand",
      material: product.material || "N/A",
      finish: product.finish || "N/A",
      dimensions: product.dimensions || 'W: N/A" H: N/A"',
      color: product.color || "N/A",
      price: product.price || 0,
      quantity: product.quantity || 1,
      timeline: product.timeline || "2-4 weeks",
      inStock: product.inStock !== undefined ? product.inStock : true,
      image: product.image || "/api/images/placeholder.png",
      link: product.link || "/marketplace",
      category: category || "Uncategorized",
    };

    setSpecProducts((prev) => [...prev, specProduct]);
  };

  const removeProductFromSpec = (productId) => {
    setSpecProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearSpec = () => {
    setSpecProducts([]);
  };

  return (
    <SpecContext.Provider
      value={{
        specCount: specProducts.length,
        specProducts,
        projectName,
        setProjectName,
        addProductToSpec,
        removeProductFromSpec,
        clearSpec,
      }}
    >
      {children}
    </SpecContext.Provider>
  );
};
