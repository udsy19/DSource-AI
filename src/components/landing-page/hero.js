import React from "react";

import Image from "next/image";
import Link from "next/link";

import sourceImage from "../../../public/material-finder-images/Frame 33 copy.png";
import sourceImage2 from "../../../public/source-image-2.jpg";
import sourceImage3 from "../../../public/source-image-3.jpg";

const Hero = () => {
  const sourceItems = [
    {
      id: "source-1",
      image: sourceImage,
      name: "Feature Sofa",
      code: "MB-03",
      productName: "Modular Chair",
      finish: "Ink",
    },
    {
      id: "source-2",
      image: sourceImage2,
      name: "Lamp",
      code: "MS-01",
      productName: "Skygarden Lamp",
      finish: "Golden",
    },
    {
      id: "source-3",
      image: sourceImage3,
      name: "Marble",
      code: "MS-03",
      productName: "Vidar",
      finish: "Honed",
    },
  ];

  return (
    <div className="w-full px-6 sm:px-10 md:px-14 lg:px-16 py-10 md:py-14">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-8 lg:gap-6">
        {/* Design Card */}
        <div className="w-full lg:w-1/3">
          <Link href="/ai-visualizer">
            <div className="flex flex-col items-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
                Design
              </h1>
              <div className="relative w-[85%] rounded-[30px] overflow-hidden h-[300px] sm:h-[380px] md:h-[420px] lg:h-[460px] mb-6">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('/material-finder-images/Minimalist Interior Design.png')",
                  }}
                />
                {/* Glass pane with cube icon — centered */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 backdrop-blur-md bg-white/10 rounded-full p-5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-white/90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 16.5V7.5L12 2 3 7.5v9l9 5.5 9-5.5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 7.5l9 5.5 9-5.5M12 13v9.5"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                AI Visualizer
              </h2>
              <p className="text-gray-500 text-center text-sm sm:text-base px-4">
                Instantly turn ideas into 3D previews and design options.
              </p>
            </div>
          </Link>
        </div>

        {/* Discover Card */}
        <div className="w-full lg:w-1/3">
          <Link href="/ai-material-finder">
            <div className="flex flex-col items-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
                Discover
              </h1>
              <div className="relative w-[85%] rounded-[30px] overflow-hidden h-[300px] sm:h-[380px] md:h-[420px] lg:h-[460px] mb-6">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('/material-finder-images/Minimalist Bedroom.png')",
                  }}
                />
                {/* Wall — radio dot on the wall (top right, was lamp) */}
                <div className="absolute top-[18%] right-[18%] flex items-center justify-center">
                  <div className="absolute w-4 h-4 rounded-full border border-white/40 animate-ping" />
                  <div className="absolute w-3 h-3 rounded-full border border-white/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                </div>
                {/* Wall — glass label */}
                <div className="absolute top-[26%] right-[8%] backdrop-blur-md bg-white/10 rounded-[15px] px-3 py-1.5">
                  <span className="text-white text-xs font-medium">Wall</span>
                </div>

                {/* Lamp — glass label (on top) */}
                <div className="absolute top-[38%] left-[20%] backdrop-blur-md bg-white/10 rounded-[15px] px-3 py-1.5">
                  <span className="text-white text-xs font-medium">Lamp</span>
                </div>
                {/* Lamp — radio dot (below label) */}
                <div className="absolute top-[48%] left-[25%] flex items-center justify-center">
                  <div className="absolute w-4 h-4 rounded-full border border-white/40 animate-ping" />
                  <div className="absolute w-3 h-3 rounded-full border border-white/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                </div>

                {/* Bedsheet — radio dot on the bed */}
                <div className="absolute bottom-[30%] left-[40%] flex items-center justify-center">
                  <div className="absolute w-4 h-4 rounded-full border border-white/40 animate-ping" />
                  <div className="absolute w-3 h-3 rounded-full border border-white/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80" />
                </div>
                {/* Bedsheet — glass label */}
                <div className="absolute bottom-[15%] left-[35%] backdrop-blur-md bg-white/10 rounded-[15px] px-3 py-1.5">
                  <span className="text-white text-xs font-medium">Bedsheet</span>
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                AI Material Finder
              </h2>
              <p className="text-gray-500 text-center text-sm sm:text-base px-4">
                Find products or materials by simply uploading a photo.
              </p>
            </div>
          </Link>
        </div>

        {/* Source Card */}
        <div className="w-full lg:w-1/3">
          <div className="flex flex-col items-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8">
              Source
            </h1>
            <div className="w-full mb-6 flex flex-col gap-3 h-[300px] sm:h-[380px] md:h-[420px] lg:h-[460px] justify-center">
              {sourceItems.map((item) => (
                <div
                  className="flex-1 rounded-xl flex items-center shadow-md shadow-black/10 border border-gray-100 max-h-[140px]"
                  key={item.id}
                >
                  <div className="flex w-full">
                    <div className="w-1/4 p-3">
                      <Image
                        src={item.image}
                        alt="source"
                        width={100}
                        height={100}
                        className="border border-gray-200 rounded-lg w-full h-auto object-cover"
                      />
                    </div>
                    <div className="w-[37.5%] flex flex-col justify-center gap-3 p-2">
                      <div className="flex flex-col">
                        <h2 className="text-sm font-bold">{item.name}</h2>
                        <p className="text-[11px] text-gray-400">
                          Product Details
                        </p>
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-sm font-bold">{item.code}</h2>
                        <p className="text-[11px] text-gray-400">
                          Product Code
                        </p>
                      </div>
                    </div>
                    <div className="w-[37.5%] flex flex-col justify-center gap-3 p-2">
                      <div className="flex flex-col">
                        <h2 className="text-sm font-bold">
                          {item.productName}
                        </h2>
                        <p className="text-[11px] text-gray-400">
                          Product Name
                        </p>
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-sm font-bold">{item.finish}</h2>
                        <p className="text-[11px] text-gray-400">Finish</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">
              Streamlined Specs
            </h2>
            <p className="text-gray-500 text-center text-sm sm:text-base px-4">
              Streamlined specs for effortless design selection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
