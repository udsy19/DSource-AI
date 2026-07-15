"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

// Using existing images from the public folder that match the design aesthetic
import heroImage from "../../../public/spacejoy.jpg";

const AboutPage = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // No video is available yet - set this to a real embed URL when one exists.
  const videoUrl = "";

  return (
    <div className="w-full min-h-screen">
      {/* Video Modal */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-colors"
              aria-label="Close video"
            >
              ×
            </button>
            {videoUrl ? (
              <iframe
                src={videoUrl}
                title="About DSource.AI Video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center gap-3 text-white p-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-12 h-12 text-white/60"
                >
                  <path
                    fillRule="evenodd"
                    d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 18.375V5.625zM21 9.375A.375.375 0 0020.625 9h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zm0 3.75a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 00.375-.375v-1.5zM10.875 18.75a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375h7.5zM3.375 15h7.5a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-7.5a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375zm0-3.75h7.5a.375.375 0 00.375-.375v-1.5A.375.375 0 0010.875 9h-7.5A.375.375 0 003 9.375v1.5c0 .207.168.375.375.375z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-lg font-semibold">Video coming soon</p>
                <p className="text-sm text-white/70 max-w-sm">
                  Our product walkthrough is on the way. Check back soon to see
                  DSource.AI in action.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mt-24 sm:mt-32 md:mt-40 px-4 sm:px-8 md:px-16 lg:px-24 pb-16">
        {/* Title */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            About DSource.AI
          </h1>
        </div>

        {/* Hero Image with Play Button */}
        <div className="relative w-full max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-lg">
            <Image
              src={heroImage}
              alt="Interior design showcase"
              fill
              className="object-cover"
              priority
            />
            {/* Play Button Overlay */}
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="absolute inset-0 flex items-center justify-center group"
              aria-label="Play video"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8 sm:w-10 sm:h-10 text-black ml-1"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Introduction Paragraph */}
        <div className="max-w-4xl mx-auto mb-12 sm:mb-16">
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
            At dsource.ai, we're building an AI-powered material sourcing and
            visualization platform for Brands and designers so discovering the
            right products, comparing options, and moving from inspiration to
            specification becomes faster, clearer, and more reliable.
          </p>
        </div>

        {/* Our Mission Section */}
        <div className="max-w-4xl mx-auto mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
            Our Mission
          </h2>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
            Our mission is to simplify the way design professionals find,
            evaluate, and organize materials with practical AI. We aim to reduce
            the time spent searching across scattered sources, eliminate
            repetitive manual documentation, and help teams make confident
            decisions without losing creativity in the process.
          </p>
        </div>

        {/* Why We Built This Section */}
        <div className="max-w-4xl mx-auto mb-16 sm:mb-24">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6">
            Why We Built This
          </h2>
          <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
            Material sourcing often means too many tabs, unclear product
            details, inconsistent spec data, and time-consuming follow-ups.
            dsource.ai brings key steps into one workflow helping you search
            smarter, visualize earlier, and document faster.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
