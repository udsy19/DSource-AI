"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CadTab from "@/components/visualizer/CadTab";
import MoodboardTab from "@/components/visualizer/MoodboardTab";
import RenderTab from "@/components/visualizer/RenderTab";
import visualizerIcon from "../../../public/visualizer-icon.png";

const TABS = [
  { key: "render", label: "AI Render", component: RenderTab },
  { key: "moodboard", label: "Mood board", component: MoodboardTab },
  { key: "cad", label: "Image to CAD", component: CadTab },
];

const AiVisualizer = () => {
  const [activeTab, setActiveTab] = useState("render");

  return (
    <div className="w-full">
      <div className="mt-20 sm:mt-28 md:mt-32 lg:mt-40 px-4 sm:px-6 md:px-8 lg:px-12">
        {/* Header row: title, mode pills, tutorial */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8">
          <div className="flex items-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              AI Visualizer
            </h1>
            <div className="w-4 sm:w-5 md:w-6 ml-2 sm:ml-3 md:ml-4">
              <Image
                src={visualizerIcon}
                alt="Visualizer Icon"
                width={24}
                height={24}
                className="sm:w-6 sm:h-6"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 lg:mx-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 sm:px-6 py-2 rounded-full text-sm font-semibold cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            href="/ai-material-finder/tutorial"
            className="hidden lg:block text-sm font-semibold border-2 border-black rounded-full px-6 py-2 hover:bg-gray-100"
          >
            View Tutorial
          </Link>
        </div>

        {/* Tabs stay mounted so uploads/params survive switching. */}
        <div className="mt-6 sm:mt-8">
          {TABS.map(({ key, component: TabComponent }) => (
            <div key={key} className={key === activeTab ? "" : "hidden"}>
              <TabComponent />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AiVisualizer;
