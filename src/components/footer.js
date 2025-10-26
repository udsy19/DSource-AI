import React from "react";

const Footer = () => {
  return (
    <div className="w-full h-[50vh] my-12 px-24 py-12" id="footer">
      <div className="flex justify-between">
        <h1 className="text-4xl font-bold">
          Join DSource.AI for 7 days free trial
        </h1>
        <div className="flex w-1/3">
          <input
            type="text"
            placeholder="Enter your email"
            className="w-2/3 bg-white/10 backdrop-blur-md shadow-sm shadow-white/50 rounded-lg pl-4 pr-16 py-2 border-2 border-white/20 focus:outline-none"
          />
          <button className="bg-orange-500 text-white rounded-full px-4 py-2 -ml-10 z-10 border-2 border-white/20">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default Footer;
