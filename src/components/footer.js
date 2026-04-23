import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <div className="w-full h-auto min-h-[40vh] sm:h-[50vh] my-6 sm:my-12 px-4 sm:px-8 md:px-16 lg:px-24 py-6 sm:py-8 md:py-12" id="footer">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-6 sm:gap-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          Join DSource.AI for 7 days free trial
        </h1>
        <div className="flex flex-col sm:flex-row w-full sm:w-1/3 gap-4 sm:gap-0">
          <input
            type="text"
            placeholder="Enter your email"
            className="w-full sm:w-2/3 bg-white/10 backdrop-blur-md shadow-sm shadow-white/50 rounded-lg pl-4 pr-4 sm:pr-16 py-2 sm:py-2 border-2 border-white/20 focus:outline-none text-white placeholder:text-white/70"
          />
          <Link
            href="/signup"
            className="inline-flex items-center justify-center bg-orange-500 text-white rounded-full px-6 sm:px-4 py-2 sm:-ml-10 sm:z-10 border-2 border-white/20 hover:bg-orange-600 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Footer;
