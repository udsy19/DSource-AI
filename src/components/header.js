import React from "react";
import Image from "next/image";

import logo from "../../public/logo.png";

const Header = () => {
  return (
    <header className="absolute top-0 left-0 w-full p-4">
      <div className="flex items-center justify-between bg-gray-900 backdrop-blur-md rounded-full shadow-lg px-14 py-4">
        <div className="w-3/12">
          <Image src={logo} alt="logo" width={72} height={72} />
        </div>
        <div className="w-6/12">
          <nav>
            <ul className="flex items-center text-white gap-8">
              <li className="font-bold">Home</li>
              <li className="font-bold">Features</li>
              <li className="font-bold">Shop Sample</li>
              <li className="font-bold">Get Inspired</li>
              <li className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="w-full bg-white text-black backdrop-blur-md rounded-xl shadow-lg pl-4 pr-16 py-2 focus:outline-none"
                  />
                  <button className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/80 p-3 rounded-xl cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-white"
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
                </div>
              </li>
            </ul>
          </nav>
        </div>
        <div className="w-3/12 flex justify-end items-center gap-8">
          <div>
            <button className="cursor-pointer text-base text-white px-4 py-4 text-bold">
              Login
            </button>
          </div>
          <div>
            <button className="cursor-pointer bg-white text-base text-black rounded-full shadow-lg px-10 py-4 flex items-center gap-2">
              Sign Up
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
