"use client";

import React, { useState, useEffect } from "react";

const PopularProducts = () => {
  const initialProducts = [
    {
      id: "popular-1",
    },
    {
      id: "popular-2",
    },
    {
      id: "popular-3",
    },
    {
      id: "popular-4",
    },
    {
      id: "popular-5",
    },
  ];

  const [products, setProducts] = useState(initialProducts);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);

  // Auto-rotate carousel every 3 seconds
  useEffect(() => {
    if (!autoRotateEnabled) return;

    const interval = setInterval(() => {
      // Rotate by moving each item one position to the right
      setProducts((prevProducts) => {
        const newOrder = [...prevProducts.slice(1), prevProducts[0]];
        return newOrder;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRotateEnabled]);

  const getCardStyle = (index) => {
    // Determine layer based on position from center
    const distanceFromCenter = Math.abs(index - 2);

    // Scale factors based on distance from center
    const scale = index === 2 ? 1.35 : 1.3 - distanceFromCenter * 0.1;

    // Adjust x-translation to create overlapping effect
    const xOffset = (index - 2) * 200;

    // Z-index decreases as distance from center increases
    const zIndex = 10 - distanceFromCenter;

    return {
      transform: `scale(${scale}) translateX(${xOffset}px)`,
      zIndex: zIndex,
      transition: "all 0.3s ease-in-out",
    };
  };

  return (
    <div className="w-full h-full p-14">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-12">Popular Products</h1>
        <div className="flex items-center justify-center h-96 w-full overflow-visible relative my-48">
          {products.map((product, index) => (
            <div
              key={`${product.id}-${index}`}
              className="absolute cursor-pointer"
              style={getCardStyle(index)}
            >
              <div
                className="w-96 h-[500px] rounded-2xl shadow-lg shadow-black/20 bg-white overflow-hidden hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
                id={product.id}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PopularProducts;
