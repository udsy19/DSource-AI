import React from "react";

const ArrowCircle = () => (
  <div className="absolute bottom-3 right-3 backdrop-blur-md bg-white/10 rounded-full w-10 h-10 flex items-center justify-center border border-white/20">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 17L17 7M17 7H7M17 7v10"
      />
    </svg>
  </div>
);

const MadeWithDsource = () => {
  return (
    <div className="w-full px-4 sm:px-8 md:px-12 pb-12 sm:pb-16 md:pb-24">
      <div className="px-4 sm:px-8 md:px-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Made With DSource.AI</h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-2 sm:mt-4">
          See how designers are using Dsource.AI
        </h2>
      </div>
      <div className="w-full h-auto sm:h-[40vh] md:h-[50vh] lg:h-[60vh] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 md:gap-8 mt-6 sm:mt-8 md:mt-12">
        <div
          className="relative w-full h-48 sm:h-56 md:h-2/3 rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 overflow-hidden"
          id="made-with-dsource-1"
        >
          <ArrowCircle />
        </div>
        <div className="flex flex-col gap-4 sm:gap-6 md:gap-12">
          <div
            className="relative w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px] overflow-hidden"
            id="made-with-dsource-2"
          >
            <ArrowCircle />
          </div>

          <div
            className="relative w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px] overflow-hidden"
            id="made-with-dsource-3"
          >
            <ArrowCircle />
          </div>
        </div>
        <div
          className="relative w-full h-48 sm:h-56 md:h-full rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 hidden sm:block overflow-hidden"
          id="made-with-dsource-4"
        >
          <ArrowCircle />
        </div>
        <div className="flex flex-col gap-4 sm:gap-6 md:gap-12">
          <div
            className="relative w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px] overflow-hidden"
            id="made-with-dsource-5"
          >
            <ArrowCircle />
          </div>

          <div
            className="relative w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px] overflow-hidden"
            id="made-with-dsource-6"
          >
            <ArrowCircle />
          </div>
        </div>
        <div
          className="relative w-full h-48 sm:h-56 md:h-2/3 rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 hidden lg:block overflow-hidden"
          id="made-with-dsource-7"
        >
          <ArrowCircle />
        </div>
      </div>
    </div>
  );
};

export default MadeWithDsource;
