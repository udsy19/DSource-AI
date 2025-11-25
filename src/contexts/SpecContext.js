"use client";
import React, { createContext, useContext, useState } from "react";

const SpecContext = createContext();

export const useSpec = () => {
  const context = useContext(SpecContext);
  if (!context) {
    throw new Error("useSpec must be used within a SpecProvider");
  }
  return context;
};

export const SpecProvider = ({ children }) => {
  const [specCount, setSpecCount] = useState(0);
  const [specProducts, setSpecProducts] = useState([]);

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
      // Store original product data for reference
      originalProduct: product,
    };

    setSpecProducts((prev) => [...prev, specProduct]);
    setSpecCount((prev) => prev + 1);
  };

  const removeProductFromSpec = (productId) => {
    setSpecProducts((prev) => prev.filter((p) => p.id !== productId));
    setSpecCount((prev) => Math.max(0, prev - 1));
  };

  const clearSpec = () => {
    setSpecProducts([]);
    setSpecCount(0);
  };

  return (
    <SpecContext.Provider
      value={{
        specCount,
        setSpecCount,
        specProducts,
        addProductToSpec,
        removeProductFromSpec,
        clearSpec,
      }}
    >
      {children}
    </SpecContext.Provider>
  );
};
