import React from "react";

import Image from "next/image";
import Link from "next/link";

import sourceImage from "../../../public/source-image-1.jpg";
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
      name: "Feature Sofa",
      code: "MB-03",
      productName: "Modular Chair",
      finish: "Ink",
    },
    {
      id: "source-3",
      image: sourceImage3,
      name: "Feature Sofa",
      code: "MB-03",
      productName: "Modular Chair",
      finish: "Ink",
    },
  ];

  return (
    <div className="w-full h-full p-14">
      <div className="flex justify-between">
        {/* Design Card */}
        <div className="w-1/3">
          <Link href="/ai-visualizer">
            <div className="flex flex-col items-center justify-center">
              <div>
                <h1 className="text-4xl font-bold mb-12">Design</h1>
              </div>
              <div className="w-2/3 mb-8 rounded-3xl" id="design-image"></div>
              <div className="flex flex-col items-center justify-center w-2/3 px-4">
                <h2 className="text-2xl font-bold mb-2">AI Visualizer</h2>
                <p className="text-gray-500 text-center">
                  Instantly turn ideas into 3D previews and design options.
                </p>
              </div>
            </div>
          </Link>
        </div>
        {/* Discover Card */}
        <div className="w-1/3">
          <Link href="/ai-material-finder">
            <div className="flex flex-col items-center justify-center">
              <div>
                <h1 className="text-4xl font-bold mb-12">Discover</h1>
              </div>
              <div className="w-2/3 mb-8 rounded-3xl" id="discover-image"></div>
              <div className="flex flex-col items-center justify-center w-2/3 px-4">
                <h2 className="text-2xl font-bold mb-2">AI Material Finder</h2>
                <p className="text-gray-500 text-center">
                  Find products or materials by simply uploading a photo.
                </p>
              </div>
            </div>
          </Link>
        </div>
        {/* Source Card */}
        <div className="w-1/3">
          <div className="flex flex-col items-center justify-center">
            <div>
              <h1 className="text-4xl font-bold mb-12">Source</h1>
            </div>
            <div className="w-2/3 mb-8 flex flex-col gap-4" id="source-image">
              {sourceItems.map((item) => (
                <div
                  className="flex-1 rounded-lg flex items-center justify-center shadow-md shadow-black/20"
                  key={item.id}
                >
                  <div className="flex">
                    <div className="w-1/3 p-4">
                      <Image
                        src={item.image}
                        alt="source"
                        width={"100%"}
                        className="border-2 border-gray-200 rounded-lg"
                      />
                    </div>
                    <div className="w-1/3 flex flex-col justify-between p-2">
                      <div className="flex flex-col justify-center">
                        <h2 className="text-sm font-bold">{item.name}</h2>
                        <p className="text-xs text-gray-500">Product Details</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <h2 className="text-sm font-bold">{item.code}</h2>
                        <p className="text-xs text-gray-500">Product Code</p>
                      </div>
                    </div>
                    <div className="w-1/3 flex flex-col justify-between p-2">
                      <div className="flex flex-col justify-center">
                        <h2 className="text-sm font-bold">
                          {item.productName}
                        </h2>
                        <p className="text-xs text-gray-500">Product Name</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <h2 className="text-sm font-bold">{item.finish}</h2>
                        <p className="text-xs text-gray-500">Finish</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center w-2/3 px-4">
              <h2 className="text-2xl font-bold mb-2">Streamlined Specs</h2>
              <p className="text-gray-500 text-center">
                Streamlined specs for effortless design selection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
