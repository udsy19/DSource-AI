import React from "react";

import Image from "next/image";
import Link from "next/link";

import aiMaterialOne from "../../../public/ai-material-finder-1.png";
import aiMaterialTwo from "../../../public/ai-material-finder-2.png";
import stepsSubtract from "../../../public/steps-subtract.png";
import browseIcon from "../../../public/browse-icon.png";
import uploadIcon from "../../../public/upload-icon.png";
import searchIcon from "../../../public/identify-icon.png";

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
      icon: browseIcon,
      title: "Identify Objects",
      description:
        "Our AI analyses your images and identifies furniture and decor items",
      number: "02",
    },
    {
      icon: searchIcon,
      title: "Browse Local Options",
      description:
        "Get a curated list of similar products available at local retailers in your area",
      number: "03",
    },
  ];

  return (
    <div className="w-full h-full my-32 p-12">
      <div className="flex flex-col items-center justify-center mb-12">
        <h1 className="text-4xl font-bold">AI Material Finder</h1>
      </div>
      <div className="grid grid-cols-5 gap-12 px-24 mb-12">
        <div className="col-span-2 pt-24">
          <h2 className="text-4xl font-bold pr-48 font-bold">
            Discover the ideal material for your space
          </h2>
          <p className="text-gray-500 text-lg mt-8 pr-32">
            Instantly discover locally available products that fit your design
            vision without the endless search.
          </p>
          <div className="mt-12">
            <Link
              href="/ai-material-finder/find"
              className="bg-black text-white px-8 py-4 rounded-full cursor-pointer hover:bg-gray-800 transition-all duration-300"
            >
              Try AI Material Finder Now
            </Link>
          </div>
        </div>
        <div className="col-span-3">
          <div
            className="w-full h-[70vh] rounded-lg shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
            id="ai-material-finder-image"
          ></div>
        </div>
      </div>
      <div className="mt-32">
        <div className="flex flex-col items-center justify-center mb-12">
          <h1 className="text-4xl font-bold">How it works</h1>
        </div>
        <div className="mt-32 grid grid-cols-3 gap-12 px-24">
          {howItWorks.map((step, index) => (
            <div className="col-span-1 relative" key={index}>
              <div className="absolute top-8 right-4">
                <Image src={step.icon} className="w-12" alt={step.title} />
              </div>
              <h1 className="text-5xl font-bold absolute bottom-8 left-4">
                {step.number}
              </h1>
              <div className="absolute top-1/3 left-8">
                <h1 className="text-3xl font-bold">{step.title}</h1>
                <p className="text-gray-500 text-lg pr-4 mt-2 font-bold">
                  {step.description}
                </p>
              </div>
              <Image src={stepsSubtract} alt="Steps Subtract" width={"100%"} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-32 px-24 h-full">
        <div className="flex flex-col items-center justify-center mb-12">
          <h1 className="text-4xl font-bold w-1/2 text-center">
            Introducing your
            <br />
            Dsource AI Shopping Assisting
          </h1>
        </div>
        <div className="flex items-center h-full gap-12 mt-24">
          <div className="w-1/3 py-12 pr-24">
            <h1 className="text-3xl font-bold">Material from ANY Image</h1>
            <p className="text-gray-500 text-lg mt-4">
              Find and shop matching furniture instantly, bringing your vision
              to life.
            </p>
          </div>
          <div className="w-2/3">
            <h1 className="text-2xl font-bold">
              <Image
                src={aiMaterialOne}
                alt="AI Material Finder"
                width={"100%"}
              />
            </h1>
          </div>
        </div>
        <div className="flex items-center h-full gap-12 mt-24">
          <div className="w-2/3">
            <h1 className="text-2xl font-bold">
              <Image
                src={aiMaterialTwo}
                alt="AI Material Finder"
                width={"100%"}
              />
            </h1>
          </div>
          <div className="w-1/3 py-12 pl-12">
            <h1 className="text-3xl font-bold">Material from ANY Image</h1>
            <p className="text-gray-500 text-lg mt-4">
              Find and shop matching furniture instantly, bringing your vision
              to life.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center mt-24">
          <Link
            href="/ai-material-finder/find"
            className="bg-black text-white px-8 py-4 rounded-full mt-8 cursor-pointer hover:bg-gray-800 transition-all duration-300"
          >
            Try It Yourself
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AiMaterialFinder;
