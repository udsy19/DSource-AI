import React from "react";

const MadeWithDsource = () => {
  return (
    <div className="w-full px-12 pb-24">
      <div className="px-12">
        <h1 className="text-5xl font-bold">Made With DSource.AI</h1>
        <h2 className="text-3xl font-bold">
          See how designers are using Dsource.AI
        </h2>
      </div>
      <div className="w-full h-[60vh] grid grid-cols-5 gap-8 mt-12">
        <div
          className="w-full h-2/3 rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
          id="made-with-dsource-1"
        ></div>
        <div className="flex flex-col gap-12">
          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
            id="made-with-dsource-2"
          ></div>

          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
            id="made-with-dsource-3"
          ></div>
        </div>
        <div
          className="w-full h-full rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
          id="made-with-dsource-4"
        ></div>
        <div className="flex flex-col gap-12">
          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
            id="made-with-dsource-5"
          ></div>

          <div
            className="w-full h-1/2 rounded-lg cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
            id="made-with-dsource-6"
          ></div>
        </div>
        <div
          className="w-full h-2/3 rounded-lg my-auto cursor-pointer shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
          id="made-with-dsource-7"
        ></div>
      </div>
    </div>
  );
};

export default MadeWithDsource;
