import React from "react";

import Image from "next/image";

import ModernMinimalistImage from "../../../public/modern-minimalist-mask.jpg";

const ModernMinimalist = () => {
  return (
    <div className="w-full h-full px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 pt-6 sm:pt-8 md:pt-12">
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 md:gap-12 justify-between">
        <div className="w-full lg:w-2/3 rounded-2xl overflow-hidden" id="mask1">
          <div className="relative">
            <Image
              src={ModernMinimalistImage}
              className="mask1 w-full h-auto"
              alt="mask1"
              width={600}
              height={400}
            />
            <button className="absolute top-32 sm:top-48 md:top-64 left-2 sm:left-4 z-20 border-2 border-black rounded-full text-sm sm:text-base md:text-lg font-bold px-6 sm:px-10 md:px-16 py-3 sm:py-4 md:py-6 bg-white/90 hover:bg-white transition-colors">
              Get Inspired
            </button>
            <div className="flex flex-col absolute top-48 sm:top-72 md:top-96 lg:top-108 left-2 sm:left-4 z-20 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold">
              <span>Modern</span>
              <span className="mt-2 sm:mt-4 md:mt-6 lg:mt-8">Minimalist</span>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/3 overflow-hidden flex flex-col gap-6 sm:gap-8 md:gap-10">
          <div className="p-4 sm:p-6 md:p-8 rounded-3xl" style={{ background: "#3E3535" }}>
            <button className="border-2 bg-white border-black rounded-full text-sm sm:text-base md:text-lg font-bold px-8 sm:px-12 md:px-16 py-3 sm:py-4 md:py-6 w-full sm:w-auto hover:bg-gray-100 transition-colors">
              Get Inspired
            </button>
            <div className="mx-2 mt-4 sm:mt-6 md:mt-8">
              <p className="text-white text-sm sm:text-base md:text-lg">
                Aesthetic furniture where every piece tells a story style
              </p>
            </div>
            <div className="mx-2 mt-4 sm:mt-6 md:mt-8">
              <h1 className="text-white text-xl sm:text-2xl font-bold">
                Into a gallery of elegance
              </h1>
            </div>
          </div>
          <div
            className="w-full h-48 sm:h-56 md:h-64 lg:h-72 mt-0 rounded-3xl px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 cursor-pointer"
            id="modern-minimalist-view-materials"
          >
            <h1 className="text-2xl sm:text-3xl font-bold">View Materials</h1>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModernMinimalist;
