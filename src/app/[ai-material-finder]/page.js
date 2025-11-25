import React from "react";

import Image from "next/image";
import Link from "next/link";

import aiMaterialOne from "../../../public/ai-material-finder-1.png";
import aiMaterialTwo from "../../../public/ai-material-finder-2.png";
import stepsSubtract from "../../../public/steps-subtract.png";
import uploadIcon from "../../../public/upload-icon.png";
import identifyIcon from "../../../public/identify-icon.png";
import shopIcon from "../../../public/shop-icon.png";

const AiMaterialFinder = () => {
  const howItWorks = [
    {
      icon: uploadIcon,
      title: "Upload your Design",
      description:
        "Start by uploading a photo or design created with our AI tools",
      number: "01",
    },
    {
      icon: identifyIcon,
      title: "Identify Objects",
      description:
        "Our AI analyses your images and identifies furniture and decor items",
      number: "02",
    },
    {
      icon: shopIcon,
      title: "Browse Local Options",
      description:
        "Get a curated list of similar products available at local retailers in your area",
      number: "03",
    },
  ];

  return (
    <div className="w-full h-full my-12 sm:my-20 md:my-32 p-4 sm:p-8 md:p-12">
      <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">AI Material Finder</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8 md:gap-12 px-4 sm:px-8 md:px-16 lg:px-24 mb-6 sm:mb-8 md:mb-12">
        <div className="col-span-1 lg:col-span-2 pt-0 sm:pt-12 md:pt-24">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold pr-0 sm:pr-8 md:pr-24 lg:pr-48 font-bold">
            Discover the ideal material for your space
          </h2>
          <p className="text-gray-500 text-base sm:text-lg mt-4 sm:mt-6 md:mt-8 pr-0 sm:pr-8 md:pr-16 lg:pr-32">
            Instantly discover locally available products that fit your design
            vision without the endless search.
          </p>
          <div className="mt-6 sm:mt-8 md:mt-12">
            <Link
              href="/ai-material-finder/find"
              className="bg-black text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full cursor-pointer hover:bg-gray-800 transition-all duration-300 inline-block text-sm sm:text-base"
            >
              Try AI Material Finder Now
            </Link>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-3">
          <div
            className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh] rounded-lg shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
            id="ai-material-finder-image"
          ></div>
        </div>
      </div>
      <div className="mt-16 sm:mt-24 md:mt-32">
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">How it works</h1>
        </div>
        <div className="mt-12 sm:mt-20 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12 px-4 sm:px-8 md:px-16 lg:px-24">
          {howItWorks.map((step, index) => (
            <div className="col-span-1 relative" key={index}>
              <div className="absolute top-4 sm:top-6 md:top-8 right-2 sm:right-4">
                <Image src={step.icon} className="w-8 sm:w-10 md:w-12" alt={step.title} width={48} height={48} />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold absolute bottom-4 sm:bottom-6 md:bottom-8 left-2 sm:left-4">
                {step.number}
              </h1>
              <div className="absolute top-1/4 sm:top-1/3 left-4 sm:left-6 md:left-8">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{step.title}</h1>
                <p className="text-gray-500 text-sm sm:text-base md:text-lg pr-2 sm:pr-4 mt-1 sm:mt-2 font-bold">
                  {step.description}
                </p>
              </div>
              <Image src={stepsSubtract} alt="Steps Subtract" width={400} height={300} className="w-full h-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-16 sm:mt-24 md:mt-32 px-4 sm:px-8 md:px-16 lg:px-24 h-full">
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold w-full sm:w-3/4 md:w-1/2 text-center">
            Introducing your
            <br />
            Dsource AI Shopping Assisting
          </h1>
        </div>
        <div className="flex flex-col lg:flex-row items-center h-full gap-6 sm:gap-8 md:gap-12 mt-12 sm:mt-16 md:mt-24">
          <div className="w-full lg:w-1/3 py-6 sm:py-8 md:py-12 pr-0 sm:pr-8 md:pr-16 lg:pr-24">
            <h1 className="text-2xl sm:text-3xl font-bold">Material from ANY Image</h1>
            <p className="text-gray-500 text-base sm:text-lg mt-2 sm:mt-4">
              Find and shop matching furniture instantly, bringing your vision
              to life.
            </p>
          </div>
          <div className="w-full lg:w-2/3">
            <h1 className="text-xl sm:text-2xl font-bold">
              <Image
                src={aiMaterialOne}
                alt="AI Material Finder"
                width={800}
                height={600}
                className="w-full h-auto"
              />
            </h1>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row items-center h-full gap-6 sm:gap-8 md:gap-12 mt-12 sm:mt-16 md:mt-24">
          <div className="w-full lg:w-2/3 order-2 lg:order-1">
            <h1 className="text-xl sm:text-2xl font-bold">
              <Image
                src={aiMaterialTwo}
                alt="AI Material Finder"
                width={800}
                height={600}
                className="w-full h-auto"
              />
            </h1>
          </div>
          <div className="w-full lg:w-1/3 py-6 sm:py-8 md:py-12 pl-0 sm:pl-8 md:pl-12 order-1 lg:order-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Material from ANY Image</h1>
            <p className="text-gray-500 text-base sm:text-lg mt-2 sm:mt-4">
              Find and shop matching furniture instantly, bringing your vision
              to life.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center mt-12 sm:mt-16 md:mt-24">
          <Link
            href="/ai-material-finder/find"
            className="bg-black text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full mt-4 sm:mt-8 cursor-pointer hover:bg-gray-800 transition-all duration-300 inline-block text-sm sm:text-base"
          >
            Try It Yourself
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
