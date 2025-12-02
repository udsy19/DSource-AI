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
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
    const centerIndex = Math.floor(products.length / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);

    const baseScale = isMobile ? 0.85 : 1.2;
    const centerScale = isMobile ? 1 : 1.35;
    const scale =
      index === centerIndex
        ? centerScale
        : baseScale - distanceFromCenter * 0.1;

    const xOffset = isMobile
      ? (index - centerIndex) * 100
      : (index - centerIndex) * 200;

    const zIndex = 10 - distanceFromCenter;

    if (isMobile) {
      return {
        transform: `translateX(${xOffset}px) scale(${scale})`,
        zIndex,
        transition: "all 0.3s ease-in-out",
      };
    }

    return {
      left: "50%",
      top: "50%",
      transform: `translate(-50%, -50%) translateX(${xOffset}px) scale(${scale})`,
      zIndex,
      transition: "all 0.3s ease-in-out",
    };
  };

  return (
    <div className="w-full h-full p-4 sm:p-8 md:p-12 lg:p-14">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 md:mb-12">
          Popular Products
        </h1>
        <div className="flex items-center justify-center h-64 sm:h-80 md:h-96 w-full overflow-x-auto md:overflow-visible relative my-12 sm:my-24 md:my-32 lg:my-48 px-4 md:px-0">
          <div className="relative flex items-center justify-center w-full gap-4 md:gap-0">
            {products.map((product, index) => (
              <div
                key={`${product.id}-${index}`}
                className="md:absolute cursor-pointer flex-shrink-0"
                style={getCardStyle(index)}
              >
                <div
                  className="w-64 sm:w-80 md:w-96 h-[350px] sm:h-[400px] md:h-[500px] rounded-2xl shadow-lg shadow-black/20 bg-white overflow-hidden hover:shadow-xl hover:shadow-black/30 transition-all duration-300"
                  id={product.id}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopularProducts;
