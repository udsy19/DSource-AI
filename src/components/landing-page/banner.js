"use client";

import Image from "next/image";
import Link from "next/link";

const productCards = [
  {
    id: "wallpaper",
    name: "Wall Paper",
    brand: "Bree",
    label: "Link to Product",
    image: "/material-finder-images/Frame 118.png",
    // Top-right, pointing at the wall
    cardPosition: "top-[27.8%] left-[73%]",
    // Radio dot at the wall
    radioPosition: "top-[35%] left-[66.8%]",
  },
  {
    id: "sofa",
    name: "Modern Sofa",
    brand: "Brere",
    label: "Link to Product",
    image: "/material-finder-images/Sofa 1.png",
    // Bottom-left, pointing at the sofa
    cardPosition: "top-[65%] left-[13.2%]",
    // Radio dot at the sofa
    radioPosition: "top-[70.8%] left-[31.2%]",
  },
  {
    id: "curtain",
    name: "Arvo Tall Lamp",
    brand: "Brere",
    label: "Link to Product",
    image: "/material-finder-images/Curtain.png",
    // Bottom-right, near the curtain/lamp
    cardPosition: "top-[61.4%] left-[72.4%]",
    // Radio dot at the curtain
    radioPosition: "top-[59.8%] left-[91.1%]",
  },
];

const ProductCard = ({ card }) => (
  <div className={`absolute ${card.cardPosition} z-20 hidden md:block`}>
    <div className="backdrop-blur-md bg-white/10 rounded-[25px] overflow-hidden w-[232px] h-[177px] p-2">
      <div className="flex items-start gap-2 mt-4 ml-2">
        <div className="relative w-[82px] h-[72px] flex-shrink-0 rounded-[20px] overflow-hidden">
          <Image
            src={card.image}
            alt={card.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <p className="font-semibold text-[13px] text-white leading-tight">
            {card.name}
          </p>
          <p className="text-[11px] text-gray-500 font-medium">
            {card.brand}
          </p>
          <p className="text-[11px] text-gray-500 font-medium underline">
            {card.label}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 mx-1">
        <button className="flex items-center justify-center gap-[5px] text-[11px] font-medium bg-white text-black rounded-[10px] border border-black py-[5px] px-[10px] h-[32px] w-[105px]">
          Show similar
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-[15px] w-[15px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
        <button className="flex items-center justify-center gap-[5px] text-[11px] font-medium bg-white text-black rounded-[10px] border border-black py-[5px] pl-[18px] pr-[13px] h-[32px] w-[101px]">
          Add to Spec
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-[19px] w-[19px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
);

const RadioDot = ({ card }) => (
  <div
    className={`absolute ${card.radioPosition} z-10 hidden md:flex items-center justify-center`}
  >
    {/* Outer pulsing ring */}
    <div className="absolute w-6 h-6 rounded-full border-2 border-white/40 animate-ping" />
    {/* Middle ring */}
    <div className="absolute w-5 h-5 rounded-full border-2 border-white/60" />
    {/* Inner filled dot */}
    <div className="w-[18px] h-[18px] rounded-full bg-white/80" />
  </div>
);

const Banner = () => {
  return (
    <div className="relative w-full h-[809px] max-h-screen overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/material-finder-images/Serene Modernist Haven.png')",
        }}
      />

      {/* Hero Content — left side */}
      <div className="absolute left-[37px] top-[176px] px-[13px] py-[7px] overflow-hidden rounded-[25px] w-[905px] max-w-[90%]">
        <p className="font-bold text-[16px] text-black mb-3">
          Your Materials Guide
        </p>
        <h1 className="text-white text-[48px] font-medium leading-normal">
          Materials Matched Projects Simplified
          <br />
          Designs Elevated.
        </h1>
      </div>

      {/* Join Us Button */}
      <div className="absolute left-[53px] top-[400px]">
        <Link
          href="/signup"
          className="inline-flex items-center bg-white rounded-full px-[13px] py-[7px] w-[193px]"
        >
          <div className="flex items-center gap-[18px] w-full whitespace-nowrap">
            <span className="font-semibold text-[24px] text-black px-[10px]">
              Join Us
            </span>
            <span className="w-[45px] h-[45px] rounded-full bg-black flex items-center justify-center flex-shrink-0">
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
                  d="M5 12h14m0 0l-7-7m7 7l-7 7"
                />
              </svg>
            </span>
          </div>
        </Link>
      </div>

      {/* Radio dots pointing at objects in the background */}
      {productCards.map((card) => (
        <RadioDot key={`radio-${card.id}`} card={card} />
      ))}

      {/* Glass-panel product cards */}
      {productCards.map((card) => (
        <ProductCard key={card.id} card={card} />
      ))}
    </div>
  );
};

export default Banner;
