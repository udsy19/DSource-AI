import React from "react";

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
          className="w-full h-48 sm:h-56 md:h-2/3 rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
          id="made-with-dsource-1"
        ></div>
        <div className="flex flex-col gap-4 sm:gap-6 md:gap-12">
          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px]"
            id="made-with-dsource-2"
          ></div>

          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px]"
            id="made-with-dsource-3"
          ></div>
        </div>
        <div
          className="w-full h-48 sm:h-56 md:h-full rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 hidden sm:block"
          id="made-with-dsource-4"
        ></div>
        <div className="flex flex-col gap-4 sm:gap-6 md:gap-12">
          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px]"
            id="made-with-dsource-5"
          ></div>

          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 min-h-[100px] sm:min-h-[120px]"
            id="made-with-dsource-6"
          ></div>
        </div>
        <div
          className="w-full h-48 sm:h-56 md:h-2/3 rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300 hidden lg:block"
          id="made-with-dsource-7"
        ></div>
      </div>
    </div>
  );
};

export default MadeWithDsource;
