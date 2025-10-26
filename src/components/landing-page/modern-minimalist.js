import React from "react";

import Image from "next/image";

import ModernMinimalistImage from "../../../public/modern-minimalist-mask.jpg";

const ModernMinimalist = () => {
  return (
    <div className="w-full h-full px-32 pt-12">
      <div className="flex gap-12 justify-between">
        <div className="w-2/3 rounded-2xl overflow-hidden" id="mask1">
          <div className="relative">
            <Image
              src={ModernMinimalistImage}
              className="mask1"
              alt="mask1"
              width={"300px"}
            />
            <button className="absolute top-64 left-4 z-20 border-2 border-black rounded-full text-lg font-bold px-16 py-6">
              Get Inspired
            </button>
            <div className="flex flex-col absolute top-108 left-4 z-20 text-7xl font-bold">
              <span>Modern</span>
              <span className="mt-8">Minimalist</span>
            </div>
          </div>
        </div>
        <div className="w-1/3 overflow-hidden">
          <div className="p-8 rounded-3xl" style={{ background: "#854D0E" }}>
            <button className="border-2 bg-white border-black rounded-full text-lg font-bold px-16 py-6">
              Get Inspired
            </button>
            <div className="mx-2 mt-8">
              <p className="text-white text-lg">
                Aesthetic furniture where every piece tells a story style
              </p>
            </div>
            <div className="mx-2 mt-8">
              <h1 className="text-white text-2xl font-bold">
                Into a gallery of elegance
              </h1>
            </div>
          </div>
          <div
            className="w-full h-72 mt-10 rounded-3xl px-8 py-12 cursor-pointer"
            id="modern-minimalist-view-materials"
          >
            <h1 className="text-3xl font-bold">View Materials</h1>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModernMinimalist;
