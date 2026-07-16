"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SpecContext = createContext();

// localStorage key for the persisted spec. Same key across shapes:
// v1 stored one global { products, projectName }; v2 stores per-folio
// buckets and migrates a found v1 payload into the "unfiled" bucket.
const STORAGE_KEY = "dsource-spec-v1";

// Bucket key for products not filed under any folio.
export const UNFILED_BUCKET_ID = "unfiled";

const DEFAULT_PROJECT_NAME = "Untitled Project";

const emptyBucket = () => ({
  projectName: DEFAULT_PROJECT_NAME,
  products: [],
});

const cleanName = (name) =>
  typeof name === "string" && name.trim() ? name.slice(0, 80) : null;

export const useSpec = () => {
  const context = useContext(SpecContext);
  if (!context) {
    throw new Error("useSpec must be used within a SpecProvider");
  }
  return context;
};

export const SpecProvider = ({ children }) => {
  const [spec, setSpec] = useState({
    buckets: { [UNFILED_BUCKET_ID]: emptyBucket() },
    activeProjectId: UNFILED_BUCKET_ID,
  });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once from localStorage so the spec survives refreshes.
  // A v1 payload ({ products, projectName }) migrates into the unfiled
  // bucket; a v2 payload ({ buckets, activeProjectId }) loads as-is.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.buckets && typeof saved.buckets === "object") {
          // v2 shape.
          const buckets = {};
          for (const [key, bucket] of Object.entries(saved.buckets)) {
            if (bucket && Array.isArray(bucket.products)) {
              buckets[key] = {
                projectName:
                  cleanName(bucket.projectName) ?? DEFAULT_PROJECT_NAME,
                products: bucket.products,
              };
            }
          }
          if (!buckets[UNFILED_BUCKET_ID]) {
            buckets[UNFILED_BUCKET_ID] = emptyBucket();
          }
          const activeProjectId = buckets[saved.activeProjectId]
            ? saved.activeProjectId
            : UNFILED_BUCKET_ID;
          setSpec({ buckets, activeProjectId });
        } else if (saved && typeof saved === "object") {
          // v1 shape — one-time migration into the unfiled bucket.
          setSpec({
            buckets: {
              [UNFILED_BUCKET_ID]: {
                projectName:
                  cleanName(saved.projectName) ?? DEFAULT_PROJECT_NAME,
                products: Array.isArray(saved.products) ? saved.products : [],
              },
            },
            activeProjectId: UNFILED_BUCKET_ID,
          });
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
        JSON.stringify({
          version: 2,
          buckets: spec.buckets,
          activeProjectId: spec.activeProjectId,
        }),
      );
    } catch {
      // Storage full/blocked — the in-memory spec still works.
    }
  }, [spec, hydrated]);

  /**
   * Files a product into a bucket. With no options it lands in the active
   * bucket (the one the spec builder shows). Passing `projectId` files it
   * under that folio — creating the bucket, adopting `projectName` when
   * given, and making it the active bucket.
   */
  const addProductToSpec = useCallback(
    (product, category, { projectId, projectName } = {}) => {
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

      setSpec((prev) => {
        const key = projectId ?? prev.activeProjectId;
        const existing = prev.buckets[key];
        return {
          buckets: {
            ...prev.buckets,
            [key]: {
              projectName:
                cleanName(projectName) ??
                existing?.projectName ??
                DEFAULT_PROJECT_NAME,
              products: [...(existing?.products ?? []), specProduct],
            },
          },
          activeProjectId: projectId ? key : prev.activeProjectId,
        };
      });
    },
    [],
  );

  const updateActiveBucket = useCallback((update) => {
    setSpec((prev) => {
      const bucket = prev.buckets[prev.activeProjectId] ?? emptyBucket();
      return {
        ...prev,
        buckets: {
          ...prev.buckets,
          [prev.activeProjectId]: { ...bucket, ...update(bucket) },
        },
      };
    });
  }, []);

  const removeProductFromSpec = useCallback(
    (productId) =>
      updateActiveBucket((bucket) => ({
        products: bucket.products.filter((p) => p.id !== productId),
      })),
    [updateActiveBucket],
  );

  const clearSpec = useCallback(
    () => updateActiveBucket(() => ({ products: [] })),
    [updateActiveBucket],
  );

  const setProjectName = useCallback(
    (name) => updateActiveBucket(() => ({ projectName: name.slice(0, 80) })),
    [updateActiveBucket],
  );

  /** Switches the active bucket. Unknown ids are ignored — no phantom buckets. */
  const setActiveProject = useCallback((projectId) => {
    const key = projectId ?? UNFILED_BUCKET_ID;
    setSpec((prev) =>
      prev.buckets[key] && prev.activeProjectId !== key
        ? { ...prev, activeProjectId: key }
        : prev,
    );
  }, []);

  const activeBucket = spec.buckets[spec.activeProjectId] ?? emptyBucket();

  return (
    <SpecContext.Provider
      value={{
        specCount: activeBucket.products.length,
        specProducts: activeBucket.products,
        projectName: activeBucket.projectName,
        setProjectName,
        addProductToSpec,
        removeProductFromSpec,
        clearSpec,
        buckets: spec.buckets,
        activeProjectId: spec.activeProjectId,
        setActiveProject,
        hydrated,
      }}
    >
      {children}
    </SpecContext.Provider>
  );
};
